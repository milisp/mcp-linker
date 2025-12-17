use tauri::State;
use crate::codex_commands::state::CodexState;
use codex_client::codex_app_server_protocol::{
    AddConversationListenerParams,
    AddConversationSubscriptionResponse,
    RemoveConversationListenerParams,
};


#[tauri::command]
pub async fn add_conversation_listener(
    params: AddConversationListenerParams,
    state: State<'_, CodexState>,
) -> Result<AddConversationSubscriptionResponse, String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.add_conversation_listener(params).await
}

#[tauri::command]
pub async fn remove_conversation_listener(
    params: RemoveConversationListenerParams,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    client.remove_conversation_listener(params).await?;
    Ok(())
}
