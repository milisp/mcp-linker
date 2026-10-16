use crate::client::ClientConfig;
use crate::clients::Storage;
use crate::json_manager::disabled_list;
use crate::json_manager::utils::{get_key_by_client, is_disabled_list_client};
use crate::codex as codex_cmds;
use crate::json_manager::JsonManager;
use serde_json::{json, Value};
use std::path::PathBuf;

#[tauri::command]
pub async fn read_json_file(client_name: String, path: Option<String>) -> Result<Value, String> {
    if crate::clients::find(&client_name).is_some_and(|c| c.storage == Storage::CodexToml) {
        let servers = codex_cmds::read_mcp_servers().await?;
        let disabled = codex_cmds::list_disabled().await?;
        let json = json!({ "mcpServers": servers, "__disabled": disabled });
        return Ok(json);
    }

    let app_config = ClientConfig::new(&client_name, path.as_deref())?;
    let file_path = app_config.get_path();

    let mut json = crate::json_manager::file_io::read_client_file(file_path, &client_name).await?;

    // Ensure the JSON always has the required structure
    if !json.is_object() {
        json = json!({});
    }

    // Callers always read "mcpServers"; mirror clients that use another key.
    let key = get_key_by_client(&client_name);
    if !json[key].is_object() {
        json[key] = json!({});
    }
    if key != "mcpServers" {
        json["mcpServers"] = json[key].clone();
    }
    // Copilot CLI's disabled servers stay in the file; list_disabled_servers reports them.
    if is_disabled_list_client(&client_name) {
        let disabled = disabled_list::read(file_path).await?;
        if let Some(servers) = json["mcpServers"].as_object_mut() {
            servers.retain(|name, _| !disabled.contains(name));
        }
    }

    Ok(json)
}

#[tauri::command]
pub async fn write_json_file(
    client_name: String,
    path: Option<String>,
    content: Value,
) -> Result<(), String> {
    crate::license::require_client(&client_name)?;
    let app_config = ClientConfig::new(&client_name, path.as_deref())?;
    let file_path = app_config.get_path();

    JsonManager::write_json_file(file_path, &content).await
}

#[tauri::command]
pub async fn get_app_path(client_name: String, path: Option<String>) -> Result<String, String> {
    let app_config = ClientConfig::new(&client_name, path.as_deref())?;
    let file_path = app_config.get_path();

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_mcplinker_config_exists() -> bool {
    let home_dir = dirs::home_dir().unwrap_or_default();
    let config_path: PathBuf = home_dir.join(".config/mcplinker/mcp.json");
    config_path.exists()
}
