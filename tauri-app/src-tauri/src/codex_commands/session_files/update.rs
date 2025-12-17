#[tauri::command]
pub async fn update_cache_title(
    project_path: String,
    session_path: String,
    preview: String,
) -> Result<(), String> {
    codex_client::db::update_session_preview(&project_path, &session_path, &preview)
}
