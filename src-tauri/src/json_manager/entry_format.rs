//! Clients whose server entries differ from the common `mcpServers` shape
//! (`command`/`args`/`env`, or `type`/`url`/`headers`, with `"disabled": true`).
//! Files are converted to the common shape on read and back on write, so the
//! rest of the app, the frontend included, only ever sees the common shape.

use crate::clients::{self, Entry};
use serde_json::{Map, Value, json};

fn entry_of(client: &str) -> Entry {
    clients::find(client).map_or(Entry::Common, |c| c.entry)
}

/// Converts every server under `key` in a freshly read file to the common shape.
pub fn servers_to_common(client: &str, key: &str, file: &mut Value) {
    map_servers(entry_of(client), key, file, to_common);
}

/// Converts every server under `key` to the client's own shape, for writing.
pub fn servers_from_common(client: &str, key: &str, file: &mut Value) {
    map_servers(entry_of(client), key, file, from_common);
}

fn map_servers(entry: Entry, key: &str, file: &mut Value, convert: fn(Entry, Map<String, Value>) -> Map<String, Value>) {
    if entry == Entry::Common {
        return;
    }
    let Some(servers) = file.get_mut(key).and_then(Value::as_object_mut) else { return };
    for server in servers.values_mut() {
        if let Value::Object(map) = server.take() {
            *server = Value::Object(convert(entry, map));
        }
    }
}

fn to_common(entry: Entry, mut map: Map<String, Value>) -> Map<String, Value> {
    // All of these turn a server off with `enabled: false`.
    if let Some(enabled) = map.remove("enabled")
        && enabled == json!(false)
    {
        map.insert("disabled".into(), json!(true));
    }
    match entry {
        Entry::OpenCode => match map.get("type").and_then(Value::as_str) {
            Some("local") => {
                map.remove("type");
                let mut command = match map.remove("command") {
                    Some(Value::Array(parts)) => parts,
                    Some(other) => vec![other],
                    None => Vec::new(),
                };
                if !command.is_empty() {
                    map.insert("command".into(), command.remove(0));
                }
                map.insert("args".into(), Value::Array(command));
                if let Some(env) = map.remove("environment") {
                    map.insert("env".into(), map_strings(env, opencode_to_env_ref));
                }
            }
            Some("remote") => {
                map.insert("type".into(), json!("http"));
            }
            _ => {}
        },
        Entry::Hermes if map.contains_key("url") => {
            let sse = map.remove("transport").is_some_and(|t| t == "sse");
            map.insert("type".into(), json!(if sse { "sse" } else { "http" }));
        }
        _ => {}
    }
    map
}

fn from_common(entry: Entry, mut map: Map<String, Value>) -> Map<String, Value> {
    if map.remove("disabled").is_some_and(|d| d == json!(true)) {
        map.insert("enabled".into(), json!(false));
    }
    let remote = ["url", "serverUrl", "httpUrl"].iter().find_map(|k| map.remove(*k));
    let transport = map.remove("type").and_then(|t| t.as_str().map(str::to_lowercase));
    match entry {
        Entry::OpenCode => {
            if let Some(url) = remote {
                map.insert("type".into(), json!("remote"));
                map.insert("url".into(), url);
            } else if let Some(command) = map.remove("command") {
                let mut parts = vec![command];
                if let Some(Value::Array(args)) = map.remove("args") {
                    parts.extend(args);
                }
                map.insert("type".into(), json!("local"));
                map.insert("command".into(), Value::Array(parts));
                if let Some(env) = map.remove("env") {
                    map.insert("environment".into(), map_strings(env, env_ref_to_opencode));
                }
            }
        }
        Entry::Hermes => {
            if let Some(url) = remote {
                map.insert("url".into(), url);
                if transport.as_deref() == Some("sse") {
                    map.insert("transport".into(), json!("sse"));
                }
            }
        }
        // Pi infers the transport from `command` or `url`; an explicit `type` must be stdio or http.
        Entry::Enabled => {
            if let Some(url) = remote {
                map.insert("url".into(), url);
            }
        }
        Entry::Common => {}
    }
    map
}

fn map_strings(value: Value, convert: fn(&str) -> String) -> Value {
    match value {
        Value::Object(map) => Value::Object(
            map.into_iter().map(|(k, v)| (k, v.as_str().map_or(v.clone(), |s| json!(convert(s))))).collect(),
        ),
        other => other,
    }
}

/// opencode writes environment references as `{env:NAME}`; the others use `${NAME}`.
fn opencode_to_env_ref(value: &str) -> String {
    replace_refs(value, "{env:", "}", "${", "}")
}

fn env_ref_to_opencode(value: &str) -> String {
    replace_refs(value, "${", "}", "{env:", "}")
}

fn replace_refs(value: &str, open: &str, close: &str, new_open: &str, new_close: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut rest = value;
    while let Some(start) = rest.find(open) {
        let after = &rest[start + open.len()..];
        let Some(end) = after.find(close) else { break };
        let name = &after[..end];
        if name.is_empty() || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            out.push_str(&rest[..start + open.len()]);
            rest = after;
            continue;
        }
        out.push_str(&rest[..start]);
        out.push_str(new_open);
        out.push_str(name);
        out.push_str(new_close);
        rest = &after[end + close.len()..];
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn round_trip(entry: Entry, file: Value) -> (Value, Value) {
        let common = Value::Object(to_common(entry, file.as_object().unwrap().clone()));
        let back = Value::Object(from_common(entry, common.as_object().unwrap().clone()));
        (common, back)
    }

    #[test]
    fn opencode_local_server() {
        let file = json!({
            "type": "local",
            "command": ["npx", "-y", "pkg"],
            "environment": { "KEY": "{env:API_KEY}", "PLAIN": "x" },
            "enabled": false,
            "timeout": 5000
        });
        let (common, back) = round_trip(Entry::OpenCode, file.clone());
        assert_eq!(common, json!({
            "command": "npx", "args": ["-y", "pkg"], "env": { "KEY": "${API_KEY}", "PLAIN": "x" },
            "disabled": true, "timeout": 5000
        }));
        assert_eq!(back, file);
    }

    #[test]
    fn opencode_remote_server() {
        let file = json!({ "type": "remote", "url": "https://s/mcp", "headers": { "A": "b" }, "oauth": false });
        let (common, back) = round_trip(Entry::OpenCode, file.clone());
        assert_eq!(common, json!({ "type": "http", "url": "https://s/mcp", "headers": { "A": "b" }, "oauth": false }));
        assert_eq!(back, file);
    }

    #[test]
    fn common_entries_become_opencode_entries() {
        let written = from_common(Entry::OpenCode, json!({ "type": "stdio", "command": "uvx", "args": ["t"] }).as_object().unwrap().clone());
        assert_eq!(Value::Object(written), json!({ "type": "local", "command": ["uvx", "t"] }));
        let written = from_common(Entry::OpenCode, json!({ "type": "sse", "serverUrl": "https://s" }).as_object().unwrap().clone());
        assert_eq!(Value::Object(written), json!({ "type": "remote", "url": "https://s" }));
    }

    #[test]
    fn hermes_transport() {
        let (common, back) = round_trip(Entry::Hermes, json!({ "url": "https://s", "transport": "sse" }));
        assert_eq!(common, json!({ "url": "https://s", "type": "sse" }));
        assert_eq!(back, json!({ "url": "https://s", "transport": "sse" }));
        let (common, back) = round_trip(Entry::Hermes, json!({ "url": "https://s", "enabled": true }));
        assert_eq!(common, json!({ "url": "https://s", "type": "http" }));
        assert_eq!(back, json!({ "url": "https://s" }));
        let (_, back) = round_trip(Entry::Hermes, json!({ "command": "uvx", "args": ["t"], "enabled": false }));
        assert_eq!(back, json!({ "command": "uvx", "args": ["t"], "enabled": false }));
    }

    #[test]
    fn pi_keeps_the_common_shape_without_type() {
        let written = from_common(Entry::Enabled, json!({ "type": "http", "url": "https://s", "disabled": true }).as_object().unwrap().clone());
        assert_eq!(Value::Object(written), json!({ "url": "https://s", "enabled": false }));
    }

    #[test]
    fn env_refs_skip_non_names() {
        assert_eq!(env_ref_to_opencode("Bearer ${TOKEN} ${not a name}"), "Bearer {env:TOKEN} ${not a name}");
        assert_eq!(opencode_to_env_ref("{env:A}{env:B}"), "${A}${B}");
    }

    #[test]
    fn common_clients_are_left_alone() {
        let mut file = json!({ "mcpServers": { "a": { "command": "x", "disabled": true } } });
        let before = file.clone();
        servers_from_common("cline", "mcpServers", &mut file);
        assert_eq!(file, before);
    }
}
