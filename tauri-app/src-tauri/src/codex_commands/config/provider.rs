use std::collections::HashMap;
use codex_client::ProviderConfig;


#[tauri::command]
pub async fn read_model_providers(
) -> Result<HashMap<String, ProviderConfig>, String> {
    codex_client::config::provider::read_model_providers().await
}

#[tauri::command]
pub async fn add_or_update_model_provider(
    provider_name: String,
    provider: ProviderConfig,
) -> Result<(), String> {
    codex_client::config::provider::add_or_update_model_provider(provider_name, provider).await
}

#[tauri::command]
pub async fn delete_model_provider(
    provider_name: String,
) -> Result<(), String> {
    codex_client::config::provider::delete_model_provider(provider_name).await
}
