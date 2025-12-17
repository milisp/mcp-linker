#[tauri::command]
pub async fn check_codex_version(
) -> Result<String, String> {
    codex_client::services::codex::check_codex_version().await
}