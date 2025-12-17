use std::collections::HashMap;
use codex_client::ProfileConfig;
use codex_client::ProviderConfig;

#[tauri::command]
pub async fn read_profiles(
) -> Result<HashMap<String, ProfileConfig>, String> {
    codex_client::config::profile::read_profiles().await
}

#[tauri::command]
pub async fn get_provider_config(
    provider_name: String,
) -> Result<Option<(ProviderConfig, Option<ProfileConfig>)>, String> {
    codex_client::config::profile::get_provider_config(provider_name).await
}

#[tauri::command]
pub async fn get_profile_config(
    profile_name: String,
) -> Result<Option<ProfileConfig>, String> {
    codex_client::config::profile::get_profile_config(profile_name).await
}

#[tauri::command]
pub async fn add_or_update_profile(
    profile_name: String,
    profile: ProfileConfig,
) -> Result<(), String> {
    codex_client::config::profile::add_or_update_profile(profile_name, profile).await
}

#[tauri::command]
pub async fn delete_profile(
    profile_name: String,
) -> Result<(), String> {
    codex_client::config::profile::delete_profile(profile_name).await
}
