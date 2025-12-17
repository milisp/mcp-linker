use serde_json::Value;

#[tauri::command]
pub fn update_project_favorites(
    project_path: String,
    favorites: Vec<String>,
) -> Result<(), String> {
    codex_client::db::update_project_favorites(project_path, favorites)
}

#[tauri::command]
pub fn remove_project_session(
    project_path: String,
    conversation_id: String,
) -> Result<(), String> {
    codex_client::db::remove_project_session(project_path, conversation_id)
}

#[tauri::command]
pub async fn load_project_sessions(
    project_path: String,
) -> Result<Value, String> {
    codex_client::session_files::load_project_sessions(project_path).await
}
