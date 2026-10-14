use crate::adapter::ClientAdapter;
use serde_json::Value;

#[tauri::command]
pub async fn disable_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.disable(server_name).await
}

#[tauri::command]
pub async fn enable_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.enable(server_name).await
}

#[tauri::command]
pub async fn list_disabled_servers(
    client_name: String,
    path: Option<String>,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.list_disabled().await
}

#[tauri::command]
pub async fn update_disabled_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
    server_config: Value,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.update_disabled(server_name, server_config).await
}
