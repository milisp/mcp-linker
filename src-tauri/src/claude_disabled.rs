use dirs::home_dir;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::command;

// Claude Code natively tracks disabled servers per project:
// ~/.claude.json -> projects[working_dir].disabledMcpServers: ["name", ...]
// The server config stays in `mcpServers`; only the name is added to / removed from the list.
const DISABLED_KEY: &str = "disabledMcpServers";

fn get_config_path() -> Result<PathBuf, String> {
    let home = home_dir().ok_or_else(|| "Failed to get home directory".to_string())?;
    Ok(home.join(".claude.json"))
}

fn read_config() -> Result<Value, String> {
    let path = get_config_path()?;
    if !path.exists() {
        return Ok(json!({"projects": {}}));
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Read Claude config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Parse Claude config: {}", e))
}

fn write_config(v: &Value) -> Result<(), String> {
    let path = get_config_path()?;
    let content =
        serde_json::to_string_pretty(v).map_err(|e| format!("Serialize Claude config: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Write Claude config: {}", e))
}

/// Get the project entry, creating missing intermediate objects.
fn project_mut<'a>(config: &'a mut Value, working_dir: &str) -> &'a mut Value {
    if !config["projects"].is_object() {
        config["projects"] = json!({});
    }
    if !config["projects"][working_dir].is_object() {
        config["projects"][working_dir] = json!({});
    }
    &mut config["projects"][working_dir]
}

fn disabled_names(project: &Value) -> Vec<String> {
    project
        .get(DISABLED_KEY)
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn set_disabled_names(project: &mut Value, names: Vec<String>) {
    project[DISABLED_KEY] = json!(names);
}

/// Build the `{ name: serverConfig }` view of disabled servers for the frontend.
/// Names without a matching `mcpServers` entry are skipped since there is nothing to render.
fn disabled_view(config: &Value, working_dir: &str) -> Value {
    let Some(project) = config.get("projects").and_then(|p| p.get(working_dir)) else {
        return json!({});
    };
    let mut out = serde_json::Map::new();
    for name in disabled_names(project) {
        if let Some(cfg) = project.get("mcpServers").and_then(|m| m.get(&name)) {
            out.insert(name, cfg.clone());
        }
    }
    Value::Object(out)
}

#[command]
pub async fn claude_list_disabled(working_dir: String) -> Result<Value, String> {
    let config = read_config()?;
    Ok(disabled_view(&config, &working_dir))
}

#[command]
pub async fn claude_disable_server(working_dir: String, name: String) -> Result<Value, String> {
    let mut config = read_config()?;
    let project = project_mut(&mut config, &working_dir);

    if project.get("mcpServers").and_then(|m| m.get(&name)).is_none() {
        return Err(format!("Server '{}' not found", name));
    }

    let mut names = disabled_names(project);
    if !names.contains(&name) {
        names.push(name);
        set_disabled_names(project, names);
        write_config(&config)?;
    }
    Ok(disabled_view(&config, &working_dir))
}

#[command]
pub async fn claude_enable_server(working_dir: String, name: String) -> Result<Value, String> {
    let mut config = read_config()?;
    let project = project_mut(&mut config, &working_dir);

    let mut names = disabled_names(project);
    names.retain(|n| n != &name);
    set_disabled_names(project, names);
    write_config(&config)?;
    Ok(disabled_view(&config, &working_dir))
}

#[command]
pub async fn claude_update_disabled(
    working_dir: String,
    name: String,
    server_config: Value,
) -> Result<Value, String> {
    let mut config = read_config()?;
    let project = project_mut(&mut config, &working_dir);

    // Update the config in place and keep the server marked as disabled.
    if !project["mcpServers"].is_object() {
        project["mcpServers"] = json!({});
    }
    project["mcpServers"][&name] = server_config;

    let mut names = disabled_names(project);
    if !names.contains(&name) {
        names.push(name);
    }
    set_disabled_names(project, names);
    write_config(&config)?;
    Ok(disabled_view(&config, &working_dir))
}
