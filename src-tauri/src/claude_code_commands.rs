use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::command;

// ~/.claude.json {projects: { "working_dir": "mcpServers": server}, other_keys: {}}
// {'sentry': {'type': 'http', 'url': 'https://mcp.sentry.dev/mcp'},
//  'airtable': {'type': 'stdio', 'command': 'npx', 'args': ['-y', 'airtable-mcp-server'], 'env': {'AIRTABLE_API_KEY': 'YOUR_KEY'}}}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCodeServer {
    pub name: String,
    pub r#type: String, // "http", "sse", "stdio"
    pub url: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCodeResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ClaudeMcpScope {
    #[default]
    Local,
    Project,
    User,
}

fn scope_target(
    working_dir: &str,
    scope: ClaudeMcpScope,
) -> Result<(PathBuf, Vec<String>), String> {
    if scope != ClaudeMcpScope::User && working_dir.trim().is_empty() {
        return Err("A working directory is required for local/project scope".into());
    }
    if scope != ClaudeMcpScope::User && !Path::new(working_dir).is_absolute() {
        return Err("The project directory must be an absolute path".into());
    }
    match scope {
        ClaudeMcpScope::Project => Ok((
            Path::new(working_dir).join(".mcp.json"),
            vec!["mcpServers".into()],
        )),
        ClaudeMcpScope::User => Ok((get_claude_config_path(None)?, vec!["mcpServers".into()])),
        ClaudeMcpScope::Local => Ok((
            get_claude_config_path(None)?,
            vec!["projects".into(), working_dir.into(), "mcpServers".into()],
        )),
    }
}

fn servers_at<'a>(
    config: &'a serde_json::Value,
    keys: &[String],
) -> Option<&'a serde_json::Map<String, serde_json::Value>> {
    let mut value = config;
    for key in keys {
        value = value.get(key)?;
    }
    value.as_object()
}

fn servers_at_mut<'a>(
    config: &'a mut serde_json::Value,
    keys: &[String],
) -> Result<&'a mut serde_json::Map<String, serde_json::Value>, String> {
    let mut value = config;
    for key in keys {
        let object = value
            .as_object_mut()
            .ok_or("Claude config contains a non-object scope container")?;
        value = object
            .entry(key.clone())
            .or_insert_with(|| serde_json::json!({}));
    }
    value
        .as_object_mut()
        .ok_or_else(|| "mcpServers must be an object".into())
}

/// List all MCP servers configured in Claude Code
#[command]
pub async fn claude_mcp_list(
    working_dir: String,
    scope: Option<ClaudeMcpScope>,
) -> Result<Vec<ClaudeCodeServer>, String> {
    let (claude_config_path, keys) = scope_target(&working_dir, scope.unwrap_or_default())?;

    if !claude_config_path.exists() {
        return Ok(Vec::new());
    }

    let config_content = fs::read_to_string(&claude_config_path)
        .map_err(|e| format!("Failed to read Claude config: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&config_content)
        .map_err(|e| format!("Failed to parse Claude config: {}", e))?;

    let mut servers = Vec::new();

    if let Some(servers_obj) = servers_at(&config, &keys) {
        for (name, server_config) in servers_obj {
            if let Ok(server) = parse_server_config(name, server_config) {
                servers.push(server);
            }
        }
    }

    Ok(servers)
}

/// Get details for a specific MCP server
#[command]
pub async fn claude_mcp_get(
    name: String,
    working_dir: String,
    scope: Option<ClaudeMcpScope>,
) -> Result<ClaudeCodeServer, String> {
    let servers = claude_mcp_list(working_dir, scope).await?;

    servers
        .into_iter()
        .find(|server| server.name == name)
        .ok_or_else(|| format!("Server '{}' not found", name))
}

/// Add a new MCP server to Claude Code
#[command]
pub async fn claude_mcp_add(
    request: ClaudeCodeServer,
    working_dir: String,
    scope: Option<ClaudeMcpScope>,
) -> Result<ClaudeCodeResponse, String> {
    let (claude_config_path, keys) = scope_target(&working_dir, scope.unwrap_or_default())?;

    // Create backup if config file exists
    let backup_path = if claude_config_path.exists() {
        Some(create_backup(&claude_config_path)?)
    } else {
        None
    };

    // Read existing config or create new one
    let mut config: serde_json::Value = if claude_config_path.exists() {
        let config_content = fs::read_to_string(&claude_config_path)
            .map_err(|e| format!("Failed to read Claude config: {}", e))?;
        serde_json::from_str(&config_content)
            .map_err(|e| format!("Failed to parse Claude config: {}", e))?
    } else {
        serde_json::json!({})
    };

    // Convert server to JSON format
    let server_json = server_to_json(&request)?;
    servers_at_mut(&mut config, &keys)?.insert(request.name.clone(), server_json);

    // Write back to file
    if let Err(e) = fs::write(
        &claude_config_path,
        serde_json::to_string_pretty(&config).unwrap(),
    ) {
        // Restore backup if write fails
        if let Some(backup_path) = &backup_path {
            let _ = restore_backup(&claude_config_path, backup_path);
        }
        return Err(format!("Failed to write Claude config: {}", e));
    }

    // Clean up backup file on success
    if let Some(backup_path) = backup_path {
        let _ = fs::remove_file(backup_path);
    }

    Ok(ClaudeCodeResponse {
        success: true,
        message: format!("Server '{}' added successfully", request.name),
    })
}

/// Remove an MCP server from Claude Code
#[command]
pub async fn claude_mcp_remove(
    name: String,
    working_dir: String,
    scope: Option<ClaudeMcpScope>,
) -> Result<ClaudeCodeResponse, String> {
    let (claude_config_path, keys) = scope_target(&working_dir, scope.unwrap_or_default())?;

    if !claude_config_path.exists() {
        return Err("Claude config file not found".to_string());
    }

    // Create backup before making changes
    let backup_path = create_backup(&claude_config_path)?;

    let config_content = fs::read_to_string(&claude_config_path)
        .map_err(|e| format!("Failed to read Claude config: {}", e))?;

    let mut config: serde_json::Value = serde_json::from_str(&config_content)
        .map_err(|e| format!("Failed to parse Claude config: {}", e))?;

    // Check if server exists in the specified working directory
    let found = servers_at_mut(&mut config, &keys)?.remove(&name).is_some();

    if found {
        // Write back to file
        if let Err(e) = fs::write(
            &claude_config_path,
            serde_json::to_string_pretty(&config).unwrap(),
        ) {
            // Restore backup if write fails
            let _ = restore_backup(&claude_config_path, &backup_path);
            return Err(format!("Failed to write Claude config: {}", e));
        }

        // Clean up backup file on success
        let _ = fs::remove_file(backup_path);

        Ok(ClaudeCodeResponse {
            success: true,
            message: format!("Server '{}' removed successfully", name),
        })
    } else {
        // Clean up backup file if server not found
        let _ = fs::remove_file(backup_path);
        Err(format!("Server '{}' not found", name))
    }
}

/// List all projects configured in Claude Code
#[command]
pub async fn claude_list_projects() -> Result<Vec<String>, String> {
    let claude_config_path = get_claude_config_path(None)?;

    if !claude_config_path.exists() {
        return Ok(Vec::new());
    }

    let config_content = fs::read_to_string(&claude_config_path)
        .map_err(|e| format!("Failed to read Claude config: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&config_content)
        .map_err(|e| format!("Failed to parse Claude config: {}", e))?;

    let mut projects = Vec::new();

    if let Some(projects_obj) = config.get("projects")
        && let Some(projects_map) = projects_obj.as_object()
    {
        for project_name in projects_map.keys() {
            projects.push(project_name.clone());
        }
    }

    projects.sort();
    Ok(projects)
}

/// Check if Claude Code CLI is available
#[command]
pub async fn check_claude_cli_available() -> Result<bool, String> {
    let output = Command::new("claude").args(["--version"]).output();

    match output {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn check_claude_config_exists() -> Result<bool, String> {
    let home_dir = dirs::home_dir().ok_or("Unable to find home directory")?;
    let path = home_dir.join(".claude.json");
    Ok(Path::new(&path).exists())
}

fn get_claude_config_path(_working_dir: Option<String>) -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Unable to find home directory")?;
    Ok(home_dir.join(".claude.json"))
}

fn parse_server_config(name: &str, config: &serde_json::Value) -> Result<ClaudeCodeServer, String> {
    let server_type = config
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("stdio")
        .to_string();

    let url = config
        .get("url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let command = config
        .get("command")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let args = config.get("args").and_then(|v| v.as_array()).map(|arr| {
        arr.iter()
            .filter_map(|v| v.as_str())
            .map(|s| s.to_string())
            .collect()
    });

    let env = config.get("env").and_then(|v| v.as_object()).map(|obj| {
        obj.iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect()
    });

    Ok(ClaudeCodeServer {
        name: name.to_string(),
        r#type: server_type,
        url,
        command,
        args,
        env,
        headers: config
            .get("headers")
            .and_then(|v| v.as_object())
            .map(|obj| {
                obj.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            }),
    })
}

fn server_to_json(server: &ClaudeCodeServer) -> Result<serde_json::Value, String> {
    let mut json = serde_json::json!({
        "type": server.r#type
    });

    if let Some(url) = &server.url {
        json["url"] = serde_json::Value::String(url.clone());
    }

    if let Some(command) = &server.command {
        json["command"] = serde_json::Value::String(command.clone());
    }

    if let Some(args) = &server.args {
        json["args"] = serde_json::Value::Array(
            args.iter()
                .map(|arg| serde_json::Value::String(arg.clone()))
                .collect(),
        );
    }

    if let Some(env) = &server.env {
        json["env"] = serde_json::Value::Object(
            env.iter()
                .map(|(k, v)| (k.clone(), serde_json::Value::String(v.clone())))
                .collect(),
        );
    }

    if let Some(headers) = &server.headers {
        json["headers"] = serde_json::Value::Object(
            headers
                .iter()
                .map(|(k, v)| (k.clone(), serde_json::Value::String(v.clone())))
                .collect(),
        );
    }

    Ok(json)
}

fn create_backup(config_path: &PathBuf) -> Result<PathBuf, String> {
    if !config_path.exists() {
        return Err("Config file does not exist".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let backup_path = config_path.with_extension(format!("json.backup.{}", timestamp));

    fs::copy(config_path, &backup_path).map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path)
}

fn restore_backup(config_path: &PathBuf, backup_path: &PathBuf) -> Result<(), String> {
    if !backup_path.exists() {
        return Err("Backup file does not exist".to_string());
    }

    fs::copy(backup_path, config_path).map_err(|e| format!("Failed to restore backup: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scopes_preserve_other_servers_and_fields() {
        let mut config = serde_json::json!({
            "preferences": {"theme": "dark"},
            "mcpServers": {"user": {"command": "user"}},
            "projects": {"/test": {"allowedTools": ["Read"], "mcpServers": {"local": {"command": "local"}}}}
        });
        let (_, local) = scope_target("/test", ClaudeMcpScope::Local).unwrap();
        let (_, user) = scope_target("", ClaudeMcpScope::User).unwrap();
        servers_at_mut(&mut config, &local)
            .unwrap()
            .insert("new".into(), serde_json::json!({"command": "new"}));
        assert_eq!(servers_at(&config, &user).unwrap().len(), 1);
        assert_eq!(
            config["projects"]["/test"]["allowedTools"],
            serde_json::json!(["Read"])
        );
        assert_eq!(config["preferences"]["theme"], "dark");
        servers_at_mut(&mut config, &local).unwrap().remove("new");
        assert_eq!(servers_at(&config, &local).unwrap().len(), 1);
        let (path, keys) = scope_target("/test", ClaudeMcpScope::Project).unwrap();
        assert_eq!(path, PathBuf::from("/test/.mcp.json"));
        assert_eq!(keys, vec!["mcpServers"]);
        assert!(scope_target("", ClaudeMcpScope::Local).is_err());
        assert!(scope_target("", ClaudeMcpScope::Project).is_err());
    }

    #[test]
    fn malformed_containers_are_not_overwritten() {
        let mut config = serde_json::json!({"mcpServers": ["keep"]});
        assert!(servers_at_mut(&mut config, &["mcpServers".into()]).is_err());
        assert_eq!(config["mcpServers"], serde_json::json!(["keep"]));
    }

    #[test]
    fn remote_server_headers_survive_config_round_trip() {
        let config = serde_json::json!({
            "type": "http",
            "url": "https://search.parallel.ai/mcp",
            "headers": { "User-Agent": "mcp-linker", "Authorization": "Bearer test" }
        });
        let server = parse_server_config("parallel-search", &config).unwrap();
        assert_eq!(server_to_json(&server).unwrap(), config);
    }

    #[test]
    fn server_without_headers_remains_compatible() {
        let config = serde_json::json!({ "type": "stdio", "command": "test-server" });
        let server = parse_server_config("test", &config).unwrap();
        assert!(server.headers.is_none());
        assert_eq!(server_to_json(&server).unwrap(), config);
    }
}
