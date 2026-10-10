//! Tool summaries from Claude Code's own authenticated MCP connection.
use claude_agent_sdk_rs::{
    ClaudeAgentOptions, ClaudeClient, McpServerConnectionStatus, McpServers, PermissionMode,
    SettingSource,
};
use serde::Serialize;
use serde_json::{Value, json};
use std::{io::Write, path::Path, time::Duration};
use tokio::{
    sync::Mutex,
    time::{sleep, timeout},
};

static INSPECTION_LOCK: Mutex<()> = Mutex::const_new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeToolsResponse {
    name: String,
    status: McpServerConnectionStatus,
    tools: Vec<claude_agent_sdk_rs::McpToolInfo>,
}

fn saved_server(root: &Value, project: &str, name: &str) -> Result<Value, String> {
    let value = root
        .get("projects")
        .and_then(|projects| projects.get(project))
        .and_then(|project| project.get("mcpServers"))
        .and_then(|servers| servers.get(name))
        .or_else(|| root.get("mcpServers").and_then(|servers| servers.get(name)))
        .filter(|value| value.is_object())
        .ok_or("Save this server in the selected Claude Code project first.")?;
    Ok(value.clone())
}

async fn inspect(project: String, name: String) -> Result<ClaudeToolsResponse, String> {
    if !Path::new(&project).is_absolute() || !Path::new(&project).is_dir() {
        return Err("Select an existing Claude Code project directory.".into());
    }
    let home = dirs::home_dir().ok_or("Home directory unavailable")?;
    let bytes = tokio::fs::read(home.join(".claude.json"))
        .await
        .map_err(|_| "Could not read Claude Code configuration.")?;
    let root: Value =
        serde_json::from_slice(&bytes).map_err(|_| "Claude Code configuration is invalid JSON.")?;
    let server = saved_server(&root, &project, &name)?;
    // Private temporary file keeps configured headers off the process command line.
    // Preserve OAuth metadata and headersHelper instead of reconstructing a URL-only config.
    let mut config = tempfile::NamedTempFile::new()
        .map_err(|_| "Could not create temporary MCP configuration.")?;
    serde_json::to_writer(&mut config, &json!({"mcpServers":{name.clone():server}}))
        .map_err(|_| "Could not prepare MCP configuration.")?;
    config
        .flush()
        .map_err(|_| "Could not prepare MCP configuration.")?;
    let options = ClaudeAgentOptions {
        cwd: Some(project.into()),
        mcp_servers: McpServers::Path(config.path().to_owned()),
        permission_mode: Some(PermissionMode::DontAsk),
        setting_sources: Some(vec![
            SettingSource::User,
            SettingSource::Project,
            SettingSource::Local,
        ]),
        settings: Some(json!({"disableAllHooks":true}).to_string()),
        extra_args: std::collections::HashMap::from([
            ("strict-mcp-config".into(), None),
            ("no-session-persistence".into(), None),
        ]),
        ..Default::default()
    };
    let mut client = ClaudeClient::new(options);
    let operation = async {
        client.connect().await.map_err(|_| "Could not start the Claude Code SDK connection. Check your Claude CLI installation.")?;
        loop {
            let response = client.get_mcp_status().await.map_err(|_| "Could not read MCP status from Claude Code. Try refreshing or updating the Claude CLI.")?;
            if let Some(server) = response
                .mcp_servers
                .into_iter()
                .find(|server| server.name == name)
            {
                if server.status != McpServerConnectionStatus::Pending
                    && (server.status != McpServerConnectionStatus::Connected
                        || server.tools.is_some())
                {
                    return Ok(ClaudeToolsResponse {
                        name: server.name,
                        status: server.status,
                        tools: server.tools.unwrap_or_default(),
                    });
                }
            }
            sleep(Duration::from_millis(500)).await;
        }
    };
    // No query/prompt is sent: only SDK initialization and mcp_status controls.
    let result = timeout(Duration::from_secs(45), operation).await
        .unwrap_or_else(|_| Err("Claude Code tool discovery timed out. Try refreshing or check /mcp in Claude Code.".into()));
    let _ = timeout(Duration::from_secs(5), client.disconnect()).await;
    result
}

#[tauri::command]
pub async fn claude_mcp_tools(
    working_dir: String,
    server_name: String,
) -> Result<ClaudeToolsResponse, String> {
    let _guard = INSPECTION_LOCK
        .try_lock()
        .map_err(|_| "Claude Code is already checking tools. Please wait and retry.")?;
    inspect(working_dir, server_name).await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn selection_preserves_auth_metadata_and_only_selects_requested_server() {
        let root = json!({"mcpServers":{"demo":{"url":"https://global.example"}},"projects":{"/project":{"mcpServers":{"demo":{"url":"https://project.example","oauth":{"clientId":"client"},"headersHelper":"auth-helper"},"other":{"command":"other"}}}}});
        let selected = saved_server(&root, "/project", "demo").unwrap();
        assert_eq!(selected["url"], "https://project.example");
        assert_eq!(selected["oauth"]["clientId"], "client");
        assert_eq!(selected["headersHelper"], "auth-helper");
        assert_eq!(
            saved_server(&root, "/missing", "demo").unwrap()["url"],
            "https://global.example"
        );
        assert!(saved_server(&root, "/project", "missing").is_err());
    }
    #[tokio::test]
    #[ignore = "Explicit live verification only; starts Claude Code and contacts configured Cloudflare MCP"]
    async fn live_cloudflare_tools() {
        let project = dirs::home_dir().unwrap().join("finance");
        let response = inspect(
            project.to_string_lossy().into_owned(),
            "cloudflare-api".into(),
        )
        .await
        .unwrap();
        println!(
            "Cloudflare status: {:?}; tools: {}",
            response.status,
            response.tools.len()
        );
        for tool in &response.tools {
            println!("Tool: {}", tool.name);
        }
        assert_eq!(response.status, McpServerConnectionStatus::Connected);
        assert!(!response.tools.is_empty());
    }
}
