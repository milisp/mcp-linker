use serde_json::Value;

#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    codex_client::session_files::scanner::scan_projects().await
}
