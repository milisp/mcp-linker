//! Explicit, short-lived MCP inspection sessions. No tools are called on connect.
use reqwest::{
    Client, Response,
    header::{HeaderMap, HeaderName, HeaderValue},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::{HashMap, HashSet},
    process::Stdio,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout, Command},
    sync::Mutex,
    time::timeout,
};
use url::Url;

const MAX_MESSAGE: usize = 4 * 1024 * 1024;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const IDLE_TIMEOUT: Duration = Duration::from_secs(600);
static NEXT_SESSION: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Default)]
pub struct InspectorState {
    sessions: Arc<Mutex<HashMap<String, SessionEntry>>>,
}
struct SessionEntry {
    session: Arc<Mutex<Session>>,
    touched: Instant,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ConnectionConfig {
    Stdio {
        command: String,
        #[serde(default)]
        args: Vec<String>,
        #[serde(default)]
        env: HashMap<String, String>,
    },
    Http {
        url: String,
        #[serde(default)]
        headers: HashMap<String, String>,
    },
    Sse {
        url: String,
        #[serde(default)]
        headers: HashMap<String, String>,
    },
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionResult {
    session_id: String,
    server_info: Value,
    capabilities: Value,
    protocol_version: String,
    tools: Vec<Value>,
}

struct Session {
    transport: Transport,
    next_id: u64,
    capabilities: Value,
    tool_names: HashSet<String>,
}
enum Transport {
    Stdio {
        _child: Child,
        input: ChildStdin,
        output: BufReader<ChildStdout>,
    },
    Http {
        client: Client,
        url: Url,
        headers: HeaderMap,
    },
    Sse {
        client: Client,
        endpoint: Url,
        headers: HeaderMap,
        events: SseReader,
    },
}
struct SseReader {
    response: Response,
    buffer: Vec<u8>,
}

fn network_error(error: reqwest::Error) -> String {
    format!("MCP network error: {}", error.without_url())
}
fn check_status(response: Response) -> Result<Response, String> {
    if response.status().is_success() {
        return Ok(response);
    }
    if matches!(response.status().as_u16(), 401 | 403) {
        return Err("Authentication required. Configure an Authorization header or authenticate in your client; client OAuth sessions are not shared with the inspector.".into());
    }
    Err(format!("MCP endpoint returned HTTP {}", response.status()))
}
fn parse_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| "Enter a valid MCP endpoint URL")?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(
            "Use an HTTP or HTTPS endpoint, with credentials in headers instead of the URL.".into(),
        );
    }
    Ok(url)
}
fn make_headers(values: HashMap<String, String>) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    for (key, value) in values {
        let name = HeaderName::try_from(key.as_str()).map_err(|_| "Invalid HTTP header name")?;
        if matches!(
            name.as_str(),
            "host" | "content-length" | "mcp-session-id" | "mcp-protocol-version"
        ) {
            return Err(format!("The inspector manages the {} header", name));
        }
        let mut value = HeaderValue::try_from(value).map_err(|_| "Invalid HTTP header value")?;
        value.set_sensitive(true);
        headers.insert(name, value);
    }
    headers.insert(
        "accept",
        HeaderValue::from_static("application/json, text/event-stream"),
    );
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    Ok(headers)
}
fn json_message(bytes: &[u8]) -> Result<Value, String> {
    serde_json::from_slice(bytes).map_err(|_| "The server returned invalid JSON-RPC data".into())
}
fn response_result(message: &Value, id: u64) -> Option<Result<Value, String>> {
    if message.get("id") != Some(&json!(id)) {
        return None;
    }
    if let Some(error) = message.get("error") {
        return Some(Err(format!(
            "MCP error {}: {}",
            error["code"],
            error["message"].as_str().unwrap_or("Request failed")
        )));
    }
    message.get("result").map(|result| Ok(result.clone()))
}
fn server_request_reply(message: &Value) -> Option<Value> {
    let id = message.get("id")?;
    let method = message.get("method")?.as_str()?;
    Some(if method == "ping" {
        json!({"jsonrpc":"2.0","id":id,"result":{}})
    } else {
        json!({"jsonrpc":"2.0","id":id,"error":{"code":-32601,"message":"The inspector does not provide sampling, roots, or elicitation."}})
    })
}

impl SseReader {
    async fn next_event(&mut self) -> Result<(String, String), String> {
        loop {
            let delimiter = self
                .buffer
                .windows(2)
                .position(|p| p == b"\n\n")
                .map(|p| (p, 2))
                .or_else(|| {
                    self.buffer
                        .windows(4)
                        .position(|p| p == b"\r\n\r\n")
                        .map(|p| (p, 4))
                });
            if let Some((index, length)) = delimiter {
                let bytes: Vec<u8> = self.buffer.drain(..index + length).collect();
                let text =
                    String::from_utf8(bytes).map_err(|_| "Invalid UTF-8 in MCP event stream")?;
                let mut event = "message".to_string();
                let mut data = Vec::new();
                for line in text.lines() {
                    if let Some(value) = line.strip_prefix("event:") {
                        event = value.trim().to_owned();
                    }
                    if let Some(value) = line.strip_prefix("data:") {
                        data.push(value.strip_prefix(' ').unwrap_or(value));
                    }
                }
                if !data.is_empty() {
                    return Ok((event, data.join("\n")));
                }
                continue;
            }
            let chunk = self
                .response
                .chunk()
                .await
                .map_err(network_error)?
                .ok_or("The MCP event stream closed")?;
            self.buffer.extend_from_slice(&chunk);
            if self.buffer.len() > MAX_MESSAGE {
                return Err("MCP event exceeded the 4 MB inspection limit".into());
            }
        }
    }
}

impl Transport {
    async fn open(config: ConnectionConfig, working_dir: Option<String>) -> Result<Self, String> {
        let (url, headers, legacy) = match config {
            ConnectionConfig::Stdio { command, args, env } => {
                if command.trim().is_empty() {
                    return Err("Enter a server command".into());
                }
                let mut process = Command::new(&command);
                process
                    .args(args)
                    .envs(env)
                    .stdin(Stdio::piped())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::null())
                    .kill_on_drop(true);
                if let Some(dir) = working_dir.filter(|dir| !dir.is_empty()) {
                    process.current_dir(dir);
                }
                #[cfg(windows)]
                process.creation_flags(0x08000000);
                let mut child = process.spawn().map_err(|_| format!("Could not start '{}'. Check that the executable is installed and the working directory exists.", command))?;
                let input = child.stdin.take().ok_or("Missing server stdin")?;
                let output = BufReader::new(child.stdout.take().ok_or("Missing server stdout")?);
                return Ok(Self::Stdio {
                    _child: child,
                    input,
                    output,
                });
            }
            ConnectionConfig::Http { url, headers } => {
                (parse_url(&url)?, make_headers(headers)?, false)
            }
            ConnectionConfig::Sse { url, headers } => {
                (parse_url(&url)?, make_headers(headers)?, true)
            }
        };
        let _ = rustls::crypto::ring::default_provider().install_default();
        let client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(10))
            .build()
            .map_err(network_error)?;
        if !legacy {
            return Ok(Self::Http {
                client,
                url,
                headers,
            });
        }
        let response = check_status(
            client
                .get(url.clone())
                .headers(headers.clone())
                .send()
                .await
                .map_err(network_error)?,
        )?;
        let mut events = SseReader {
            response,
            buffer: Vec::new(),
        };
        let (event, endpoint) = events.next_event().await?;
        if event != "endpoint" {
            return Err("Legacy SSE server did not provide a message endpoint. Try HTTP transport if it uses Streamable HTTP.".into());
        }
        let endpoint = url
            .join(&endpoint)
            .map_err(|_| "Invalid SSE message endpoint")?;
        if endpoint.origin() != url.origin() {
            return Err(
                "Cross-origin SSE message endpoints are not supported; use a same-origin endpoint."
                    .into(),
            );
        }
        Ok(Self::Sse {
            client,
            endpoint,
            headers,
            events,
        })
    }
    fn protocol_version(&mut self, version: &str) -> Result<(), String> {
        if let Self::Http { headers, .. } = self {
            headers.insert(
                "mcp-protocol-version",
                HeaderValue::try_from(version).map_err(|_| "Invalid protocol version")?,
            );
        }
        Ok(())
    }
    async fn send(&mut self, message: &Value, expected_id: Option<u64>) -> Result<Value, String> {
        let bytes = serde_json::to_vec(message).map_err(|_| "Could not encode MCP request")?;
        if bytes.len() > MAX_MESSAGE {
            return Err("Request exceeds the 4 MB inspection limit".into());
        }
        match self {
            Self::Stdio { input, output, .. } => {
                input
                    .write_all(&bytes)
                    .await
                    .map_err(|_| "Server stdin closed")?;
                input
                    .write_all(b"\n")
                    .await
                    .map_err(|_| "Server stdin closed")?;
                input.flush().await.map_err(|_| "Server stdin closed")?;
                let Some(id) = expected_id else {
                    return Ok(Value::Null);
                };
                loop {
                    let mut line = Vec::new();
                    let count = output
                        .take((MAX_MESSAGE + 1) as u64)
                        .read_until(b'\n', &mut line)
                        .await
                        .map_err(|_| "Could not read server stdout")?;
                    if count == 0 {
                        return Err("Server closed its output. Check the command, arguments, and credentials.".into());
                    }
                    if line.len() > MAX_MESSAGE {
                        return Err("Server message exceeded the 4 MB inspection limit".into());
                    }
                    let incoming = json_message(&line)?;
                    if let Some(result) = response_result(&incoming, id) {
                        return result;
                    }
                    if let Some(reply) = server_request_reply(&incoming) {
                        input
                            .write_all(format!("{}\n", reply).as_bytes())
                            .await
                            .map_err(|_| "Server stdin closed")?;
                        input.flush().await.map_err(|_| "Server stdin closed")?;
                    }
                }
            }
            Self::Http {
                client,
                url,
                headers,
            } => {
                let mut response = check_status(
                    client
                        .post(url.clone())
                        .headers(headers.clone())
                        .body(bytes)
                        .send()
                        .await
                        .map_err(network_error)?,
                )?;
                if let Some(session_id) = response.headers().get("mcp-session-id") {
                    headers.insert("mcp-session-id", session_id.clone());
                }
                let Some(id) = expected_id else {
                    return Ok(Value::Null);
                };
                if response
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("")
                    .starts_with("text/event-stream")
                {
                    let mut events = SseReader {
                        response,
                        buffer: Vec::new(),
                    };
                    loop {
                        let (_, data) = events.next_event().await?;
                        let incoming = json_message(data.as_bytes())?;
                        if let Some(result) = response_result(&incoming, id) {
                            return result;
                        }
                        if let Some(reply) = server_request_reply(&incoming) {
                            check_status(
                                client
                                    .post(url.clone())
                                    .headers(headers.clone())
                                    .body(reply.to_string())
                                    .send()
                                    .await
                                    .map_err(network_error)?,
                            )?;
                        }
                    }
                }
                let mut data = Vec::new();
                while let Some(chunk) = response.chunk().await.map_err(network_error)? {
                    data.extend_from_slice(&chunk);
                    if data.len() > MAX_MESSAGE {
                        return Err("Server response exceeded the 4 MB inspection limit".into());
                    }
                }
                response_result(&json_message(&data)?, id)
                    .ok_or("Server returned an unexpected JSON-RPC response")?
            }
            Self::Sse {
                client,
                endpoint,
                headers,
                events,
            } => {
                check_status(
                    client
                        .post(endpoint.clone())
                        .headers(headers.clone())
                        .body(bytes)
                        .send()
                        .await
                        .map_err(network_error)?,
                )?;
                let Some(id) = expected_id else {
                    return Ok(Value::Null);
                };
                loop {
                    let (_, data) = events.next_event().await?;
                    let incoming = json_message(data.as_bytes())?;
                    if let Some(result) = response_result(&incoming, id) {
                        return result;
                    }
                    if let Some(reply) = server_request_reply(&incoming) {
                        check_status(
                            client
                                .post(endpoint.clone())
                                .headers(headers.clone())
                                .body(reply.to_string())
                                .send()
                                .await
                                .map_err(network_error)?,
                        )?;
                    }
                }
            }
        }
    }
    async fn close(&mut self) {
        match self {
            Self::Stdio { _child, .. } => {
                let _ = _child.kill().await;
            }
            Self::Http {
                client,
                url,
                headers,
            } if headers.contains_key("mcp-session-id") => {
                let _ = timeout(
                    Duration::from_secs(3),
                    client.delete(url.clone()).headers(headers.clone()).send(),
                )
                .await;
            }
            _ => {}
        }
    }
}
impl Session {
    async fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        self.transport
            .send(
                &json!({"jsonrpc":"2.0","id":id,"method":method,"params":params}),
                Some(id),
            )
            .await
    }
    async fn list_tools(&mut self) -> Result<Vec<Value>, String> {
        if self.capabilities.get("tools").is_none() {
            return Ok(Vec::new());
        }
        let mut tools = Vec::new();
        let mut cursors = HashSet::new();
        let mut names = HashSet::new();
        let mut params = json!({});
        loop {
            let page = self.request("tools/list", params).await?;
            let entries = page
                .get("tools")
                .and_then(Value::as_array)
                .ok_or("Server returned an invalid tool list")?;
            for tool in entries {
                if tool.get("name").and_then(Value::as_str).is_none()
                    || !tool.get("inputSchema").is_some_and(Value::is_object)
                {
                    return Err("Server returned an invalid tool definition".into());
                }
                let name = tool["name"].as_str().unwrap();
                if name.is_empty() || !names.insert(name.to_owned()) {
                    return Err("Server returned an empty or duplicate tool name".into());
                }
                for field in ["title", "description"] {
                    if tool.get(field).is_some_and(|value| !value.is_string()) {
                        return Err(format!("Server returned an invalid tool {}", field));
                    }
                }
                for field in ["annotations", "outputSchema"] {
                    if tool.get(field).is_some_and(|value| !value.is_object()) {
                        return Err(format!("Server returned an invalid tool {}", field));
                    }
                }
                tools.push(tool.clone());
            }
            if tools.len() > 5000 {
                return Err("Tool list exceeded the 5,000-tool inspection limit".into());
            }
            match page
                .get("nextCursor")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
            {
                Some(cursor) if cursors.insert(cursor.to_owned()) => {
                    params = json!({"cursor":cursor})
                }
                Some(_) => return Err("Server returned a repeated tool-list cursor".into()),
                None => break,
            }
        }
        self.tool_names = tools
            .iter()
            .filter_map(|tool| tool["name"].as_str().map(str::to_owned))
            .collect();
        Ok(tools)
    }
}
impl InspectorState {
    pub async fn expire_idle(&self) {
        let expired = {
            let mut sessions = self.sessions.lock().await;
            let ids: Vec<_> = sessions
                .iter()
                .filter(|(_, entry)| entry.touched.elapsed() >= IDLE_TIMEOUT)
                .map(|(id, _)| id.clone())
                .collect();
            ids.into_iter()
                .filter_map(|id| sessions.remove(&id).map(|entry| entry.session))
                .collect::<Vec<_>>()
        };
        for session in expired {
            session.lock().await.transport.close().await;
        }
    }
    async fn get(&self, id: &str) -> Result<Arc<Mutex<Session>>, String> {
        self.expire_idle().await;
        let mut sessions = self.sessions.lock().await;
        let entry = sessions
            .get_mut(id)
            .ok_or("Inspection session ended. Connect again to continue.")?;
        entry.touched = Instant::now();
        Ok(entry.session.clone())
    }
    async fn remove(&self, id: &str) -> Option<Arc<Mutex<Session>>> {
        self.sessions
            .lock()
            .await
            .remove(id)
            .map(|entry| entry.session)
    }
}

#[tauri::command]
pub async fn mcp_inspector_connect(
    state: tauri::State<'_, InspectorState>,
    config: ConnectionConfig,
    working_dir: Option<String>,
) -> Result<ConnectionResult, String> {
    let transport = timeout(REQUEST_TIMEOUT, Transport::open(config, working_dir))
        .await
        .map_err(|_| "Connection startup timed out after 30 seconds")??;
    let mut session = Session {
        transport,
        next_id: 1,
        capabilities: json!({}),
        tool_names: HashSet::new(),
    };
    let handshake = async {
        let initialized = session.request("initialize", json!({"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"mcp-linker-inspector","version":env!("CARGO_PKG_VERSION")}})).await?;
        if !initialized.get("serverInfo").is_some_and(Value::is_object)
            || !initialized
                .get("capabilities")
                .is_some_and(Value::is_object)
        {
            return Err("Server returned invalid initialization metadata".into());
        }
        let version = initialized["protocolVersion"]
            .as_str()
            .ok_or("Server did not negotiate an MCP protocol version")?
            .to_owned();
        if !["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"].contains(&version.as_str()) {
            return Err(format!(
                "Inspector does not support protocol version {}",
                version
            ));
        }
        session.transport.protocol_version(&version)?;
        session.capabilities = initialized
            .get("capabilities")
            .cloned()
            .unwrap_or(json!({}));
        session
            .transport
            .send(
                &json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
                None,
            )
            .await?;
        let tools = session.list_tools().await?;
        Ok::<_, String>((initialized, version, tools))
    };
    let (initialized, version, tools) = match timeout(REQUEST_TIMEOUT, handshake).await {
        Ok(Ok(result)) => result,
        result => {
            session.transport.close().await;
            return Err(match result { Ok(Err(error)) => error, _ => "Connection timed out after 30 seconds. Check the endpoint or local server startup.".into() });
        }
    };
    state.expire_idle().await;
    let mut sessions = state.sessions.lock().await;
    if sessions.len() >= 32 {
        drop(sessions);
        session.transport.close().await;
        return Err("Too many inspector sessions. Disconnect an existing session.".into());
    }
    let id = NEXT_SESSION.fetch_add(1, Ordering::Relaxed).to_string();
    let result = ConnectionResult {
        session_id: id.clone(),
        server_info: initialized.get("serverInfo").cloned().unwrap_or(json!({})),
        capabilities: session.capabilities.clone(),
        protocol_version: version,
        tools,
    };
    sessions.insert(
        id,
        SessionEntry {
            session: Arc::new(Mutex::new(session)),
            touched: Instant::now(),
        },
    );
    Ok(result)
}

#[tauri::command]
pub async fn mcp_inspector_list_tools(
    state: tauri::State<'_, InspectorState>,
    session_id: String,
) -> Result<Vec<Value>, String> {
    let session = state.get(&session_id).await?;
    let result = timeout(REQUEST_TIMEOUT, async {
        session.lock().await.list_tools().await
    })
    .await;
    match result {
        Ok(value) => value,
        Err(_) => {
            state.remove(&session_id).await;
            session.lock().await.transport.close().await;
            Err("Tool discovery timed out. Connect again to continue.".into())
        }
    }
}
#[tauri::command]
pub async fn mcp_inspector_call_tool(
    state: tauri::State<'_, InspectorState>,
    session_id: String,
    name: String,
    arguments: Value,
) -> Result<Value, String> {
    if !arguments.is_object() {
        return Err("Tool arguments must be a JSON object".into());
    }
    let session = state.get(&session_id).await?;
    let result = timeout(Duration::from_secs(60), async {
        let mut session = session.lock().await;
        if !session.tool_names.contains(&name) {
            return Err("This tool was not advertised by the connected server".into());
        }
        session
            .request("tools/call", json!({"name":name,"arguments":arguments}))
            .await
    })
    .await;
    match result {
        Ok(value) => value,
        Err(_) => {
            state.remove(&session_id).await;
            session.lock().await.transport.close().await;
            Err("Tool call timed out and the connection was closed. The tool may already have run; check its effects before retrying.".into())
        }
    }
}
#[tauri::command]
pub async fn mcp_inspector_disconnect(
    state: tauri::State<'_, InspectorState>,
    session_id: String,
) -> Result<(), String> {
    if let Some(session) = state.remove(&session_id).await {
        session.lock().await.transport.close().await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn endpoint_and_headers_are_validated() {
        assert!(parse_url("file:///etc/passwd").is_err());
        assert!(parse_url("https://user:secret@example.com/mcp").is_err());
        assert!(make_headers(HashMap::from([("Host".into(), "other".into())])).is_err());
        assert_eq!(
            server_request_reply(&json!({"id":9,"method":"ping"})).unwrap()["result"],
            json!({})
        );
        assert_eq!(
            server_request_reply(&json!({"id":9,"method":"sampling/createMessage"})).unwrap()["error"]
                ["code"],
            -32601
        );
    }
    #[cfg(unix)]
    #[tokio::test]
    async fn stdio_pagination_ping_and_explicit_call() {
        let script = r#"while IFS= read -r line; do
case "$line" in
*'"method":"initialize"'*) printf '%s\n' '{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"fixture","version":"1"}}}' ;;
*'"method":"notifications/initialized"'*) ;;
*'"method":"tools/list"'*) case "$line" in
*'"cursor"'*) printf '%s\n' '{"jsonrpc":"2.0","id":3,"result":{"tools":[{"name":"write","inputSchema":{"type":"object"}}]}}' ;;
*) printf '%s\n' '{"jsonrpc":"2.0","id":90,"method":"ping"}' '{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"read","inputSchema":{"type":"object"}}],"nextCursor":"page2"}}' ;; esac ;;
*'"method":"tools/call"'*) printf '%s\n' '{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"explicit call"}],"isError":false}}' ;;
esac
done"#;
        let transport = Transport::open(
            ConnectionConfig::Stdio {
                command: "/bin/sh".into(),
                args: vec!["-c".into(), script.into()],
                env: HashMap::new(),
            },
            None,
        )
        .await
        .unwrap();
        let mut session = Session {
            transport,
            next_id: 1,
            capabilities: json!({}),
            tool_names: HashSet::new(),
        };
        let init = session.request("initialize", json!({})).await.unwrap();
        session.capabilities = init["capabilities"].clone();
        session
            .transport
            .send(&json!({"method":"notifications/initialized"}), None)
            .await
            .unwrap();
        let tools = timeout(Duration::from_secs(3), session.list_tools())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(tools.len(), 2);
        assert!(session.tool_names.contains("write"));
        let result = session
            .request("tools/call", json!({"name":"read","arguments":{}}))
            .await
            .unwrap();
        assert_eq!(result["content"][0]["text"], "explicit call");
        session.transport.close().await;
        if let Transport::Stdio { _child, .. } = &mut session.transport {
            assert!(_child.try_wait().unwrap().is_some());
        }
    }
    #[tokio::test]
    async fn streamable_http_session_and_sse_response() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/mcp", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            for index in 0..3 {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                let mut chunk = [0; 1024];
                loop {
                    let count = socket.read(&mut chunk).await.unwrap();
                    request.extend_from_slice(&chunk[..count]);
                    if let Some(end) = request.windows(4).position(|part| part == b"\r\n\r\n") {
                        let headers = String::from_utf8_lossy(&request[..end]);
                        let length = headers
                            .lines()
                            .find_map(|line| {
                                line.to_lowercase()
                                    .strip_prefix("content-length: ")
                                    .and_then(|value| value.parse::<usize>().ok())
                            })
                            .unwrap_or(0);
                        if request.len() >= end + 4 + length {
                            break;
                        }
                    }
                }
                let request = String::from_utf8(request).unwrap().to_lowercase();
                if index > 0 {
                    assert!(request.contains("mcp-session-id: fixture"));
                    assert!(request.contains("mcp-protocol-version: 2025-11-25"));
                }
                let body = match index {
                    0 => "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}",
                    1 => {
                        "event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"tools\":[]}}\n\n"
                    }
                    _ => "",
                };
                if index == 2 {
                    assert!(request.starts_with("delete "));
                }
                let content_type = if index == 1 {
                    "text/event-stream"
                } else {
                    "application/json"
                };
                let reply = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nMcp-Session-Id: fixture\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                socket.write_all(reply.as_bytes()).await.unwrap();
            }
        });
        let mut transport = Transport::open(
            ConnectionConfig::Http {
                url,
                headers: HashMap::new(),
            },
            None,
        )
        .await
        .unwrap();
        transport
            .send(&json!({"id":1,"method":"initialize"}), Some(1))
            .await
            .unwrap();
        transport.protocol_version("2025-11-25").unwrap();
        let result = transport
            .send(&json!({"id":2,"method":"tools/list"}), Some(2))
            .await
            .unwrap();
        assert_eq!(result["tools"], json!([]));
        transport.close().await;
        server.await.unwrap();
    }
    #[tokio::test]
    async fn legacy_sse_uses_the_advertised_endpoint() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/sse", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut data = [0; 2048];
            let size = stream.read(&mut data).await.unwrap();
            assert!(String::from_utf8_lossy(&data[..size]).starts_with("GET /sse"));
            stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\nevent: endpoint\ndata: /messages?session=fixture\n\n").await.unwrap();
            let (mut post, _) = listener.accept().await.unwrap();
            let size = post.read(&mut data).await.unwrap();
            assert!(
                String::from_utf8_lossy(&data[..size])
                    .starts_with("POST /messages?session=fixture")
            );
            post.write_all(
                b"HTTP/1.1 202 Accepted\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
            )
            .await
            .unwrap();
            stream.write_all(b"event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"tools\":[]}}\n\n").await.unwrap();
        });
        let mut transport = Transport::open(
            ConnectionConfig::Sse {
                url,
                headers: HashMap::new(),
            },
            None,
        )
        .await
        .unwrap();
        assert_eq!(
            transport
                .send(&json!({"id":1,"method":"tools/list"}), Some(1))
                .await
                .unwrap()["tools"],
            json!([])
        );
        transport.close().await;
        server.await.unwrap();
    }
}
