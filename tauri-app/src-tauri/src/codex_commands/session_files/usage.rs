use serde_json::Value;

#[tauri::command]
pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    codex_client::db::read_token_usage().await
}
