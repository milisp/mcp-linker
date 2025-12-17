use codex_client::config::project::Project;

#[tauri::command]
pub async fn read_codex_config(
) -> Result<Vec<Project>, String> {
    codex_client::config::project::read_codex_config().await
}

#[tauri::command]
pub async fn is_version_controlled(
    path: String,
) -> Result<bool, String> {
    codex_client::config::project::is_version_controlled(path).await
}

#[tauri::command]
pub async fn set_project_trust(
    path: String,
    trust_level: String,
) -> Result<(), String> {
    codex_client::config::project::set_project_trust(path, trust_level).await
}

#[tauri::command]
pub async fn get_project_name(
    path: String,
) -> Result<String, String> {
    codex_client::config::project::get_project_name(path).await
}
