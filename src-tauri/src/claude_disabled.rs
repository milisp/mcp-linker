use dirs::home_dir;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::command;

fn get_disabled_path() -> Result<PathBuf, String> {
    let home = home_dir().ok_or_else(|| "Failed to get home directory".to_string())?;
    Ok(home.join(".claude.disabled.json"))
}

fn read_disabled_file() -> Result<Value, String> {
    let path = get_disabled_path()?;
    if !path.exists() {
        return Ok(json!({"projects": {}}));
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Read disabled file: {}", e))?;
    let v: Value =
        serde_json::from_str(&content).map_err(|e| format!("Parse disabled file: {}", e))?;
    Ok(v)
}

fn write_disabled_file(v: &Value) -> Result<(), String> {
    let path = get_disabled_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Create dir failed: {}", e))?;
    }
    fs::write(&path, serde_json::to_string_pretty(v).unwrap())
        .map_err(|e| format!("Write disabled file: {}", e))
}

#[command]
pub async fn claude_list_disabled(working_dir: String) -> Result<Value, String> {
    let v = read_disabled_file()?;
    Ok(v.get("projects")
        .and_then(|p| p.get(&working_dir))
        .cloned()
        .unwrap_or(json!({})))
}

#[command]
pub async fn claude_disable_server(working_dir: String, name: String) -> Result<Value, String> {
    // Read current disabled and Claude config to fetch config for the named server
    let mut disabled = read_disabled_file()?;
    if !disabled["projects"].is_object() {
        disabled["projects"] = json!({});
    }
    if !disabled["projects"][&working_dir].is_object() {
        disabled["projects"][&working_dir] = json!({});
    }

    // Try to read from Claude config to copy server config
    let servers = crate::claude_code_commands::claude_mcp_list(working_dir.clone()).await?;
    if let Some(s) = servers.into_iter().find(|s| s.name == name) {
        // Convert to JSON matching Manage shape
        let mut cfg = json!({"type": s.r#type});
        if let Some(url) = s.url {
            cfg["url"] = json!(url);
        }
        if let Some(cmd) = s.command {
            cfg["command"] = json!(cmd);
        }
        if let Some(args) = s.args {
            cfg["args"] = json!(args);
        }
        if let Some(env) = s.env {
            cfg["env"] = json!(env);
        }
        if let Some(headers) = s.headers {
            cfg["headers"] = json!(headers);
        }
        disabled["projects"][&working_dir][&name] = cfg;
        write_disabled_file(&disabled)?;

        // Remove from ~/.claude.json active list
        let _ =
            crate::claude_code_commands::claude_mcp_remove(name.clone(), working_dir.clone()).await;
    }
    Ok(disabled["projects"][&working_dir].clone())
}

#[command]
pub async fn claude_enable_server(working_dir: String, name: String) -> Result<Value, String> {
    let mut disabled = read_disabled_file()?;

    // Read config from disabled store to re-add
    let maybe_cfg = disabled
        .get("projects")
        .and_then(|p| p.get(&working_dir))
        .and_then(|m| m.get(&name))
        .cloned();

    if let Some(cfg) = maybe_cfg {
        // Map disabled config back to ClaudeCodeServer and add
        let server = crate::claude_code_commands::ClaudeCodeServer {
            name: name.clone(),
            r#type: cfg
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("http")
                .to_string(),
            url: cfg
                .get("url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            command: cfg
                .get("command")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            args: cfg.get("args").and_then(|v| v.as_array()).map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect()
            }),
            env: cfg.get("env").and_then(|v| v.as_object()).map(|m| {
                m.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            }),
            headers: cfg.get("headers").and_then(|v| v.as_object()).map(|m| {
                m.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            }),
        };
        let _ = crate::claude_code_commands::claude_mcp_add(server, working_dir.clone()).await;
    }

    // Remove from disabled store
    if disabled["projects"].is_object() && disabled["projects"][&working_dir].is_object() {
        if let Some(map) = disabled["projects"][&working_dir].as_object_mut() {
            map.remove(&name);
        }
    }
    write_disabled_file(&disabled)?;

    Ok(disabled
        .get("projects")
        .and_then(|p| p.get(&working_dir))
        .cloned()
        .unwrap_or(json!({})))
}

#[command]
pub async fn claude_update_disabled(
    working_dir: String,
    name: String,
    server_config: Value,
) -> Result<Value, String> {
    let mut disabled = read_disabled_file()?;
    if !disabled["projects"].is_object() {
        disabled["projects"] = json!({});
    }
    if !disabled["projects"][&working_dir].is_object() {
        disabled["projects"][&working_dir] = json!({});
    }
    disabled["projects"][&working_dir][&name] = server_config;
    write_disabled_file(&disabled)?;
    Ok(disabled["projects"][&working_dir].clone())
}
