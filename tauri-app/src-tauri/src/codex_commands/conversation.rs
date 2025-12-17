use tauri::State;
use crate::codex_commands::state::CodexState;
use codex_client::codex_app_server_protocol::{
    InterruptConversationParams,
    InterruptConversationResponse,
    NewConversationParams,
    NewConversationResponse,
    ResumeConversationParams,
    ResumeConversationResponse,
    SendUserMessageParams,
    SendUserMessageResponse,
    TurnStartParams,
    TurnStartResponse,
};


#[tauri::command]
pub async fn new_conversation(
    params: NewConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, CodexState>,
) -> Result<NewConversationResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.new_conversation(params, overrides).await
}

#[tauri::command]
pub async fn send_user_message(
    params: SendUserMessageParams,
    state: State<'_, CodexState>,
) -> Result<SendUserMessageResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.send_user_message(params).await
}

#[tauri::command]
pub async fn turn_start(
    params: TurnStartParams,
    state: State<'_, CodexState>,
) -> Result<TurnStartResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.turn_start(params).await
}

#[tauri::command]
pub async fn interrupt_conversation(
    params: InterruptConversationParams,
    state: State<'_, CodexState>,
) -> Result<InterruptConversationResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.interrupt_conversation(params).await
}

#[tauri::command]
pub async fn resume_conversation(
    params: ResumeConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, CodexState>,
) -> Result<ResumeConversationResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.resume_conversation(params, overrides).await
}
