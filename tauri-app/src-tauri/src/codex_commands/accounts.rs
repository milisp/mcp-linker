use tauri::State;
use crate::codex_commands::state::CodexState;
use codex_client::codex_app_server_protocol::{
    CancelLoginAccountResponse,
    GetAccountRateLimitsResponse,
    GetAccountResponse,
    LoginAccountParams,
    LoginAccountResponse,
    LogoutAccountResponse,
};

#[tauri::command]
pub async fn get_account(
    state: State<'_, CodexState>,
    refresh_token: Option<bool>,
) -> Result<GetAccountResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.get_account(refresh_token.unwrap_or(false)).await
}

#[tauri::command]
pub async fn get_account_rate_limits(
    state: State<'_, CodexState>,
) -> Result<GetAccountRateLimitsResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.get_account_rate_limits().await
}

#[tauri::command]
pub async fn login_account_chatgpt(
    state: State<'_, CodexState>,
) -> Result<LoginAccountResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.login_account(LoginAccountParams::Chatgpt).await
}

#[tauri::command]
pub async fn login_account_api_key(
    state: State<'_, CodexState>,
    api_key: String,
) -> Result<LoginAccountResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.login_account(LoginAccountParams::ApiKey { api_key }).await
}

#[tauri::command]
pub async fn cancel_login_account(
    state: State<'_, CodexState>,
    login_id: String,
) -> Result<CancelLoginAccountResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.cancel_login_account(login_id).await
}

#[tauri::command]
pub async fn logout_account(
    state: State<'_, CodexState>,
) -> Result<LogoutAccountResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.logout_account().await
}
