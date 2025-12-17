use tauri::State;
use crate::codex_commands::state::CodexState;
use codex_client::codex_protocol::protocol::ReviewDecision;

fn parse_review_decision(decision: &str) -> Result<ReviewDecision, String> {
    let normalized = decision.trim().to_lowercase().replace('-', "_");
    match normalized.as_str() {
        "approved" => Ok(ReviewDecision::Approved),
        "approved_for_session" => Ok(ReviewDecision::ApprovedForSession),
        "denied" => Ok(ReviewDecision::Denied),
        "abort" => Ok(ReviewDecision::Abort),
        other => Err(format!("Unsupported review decision: {other}")),
    }
}

#[tauri::command]
pub async fn respond_exec_command_request(
    request_token: String,
    decision: String,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    let parsed = parse_review_decision(&decision)?;
    client.respond_exec_command_request(&request_token, parsed).await
}

#[tauri::command]
pub async fn respond_apply_patch_request(
    request_token: String,
    decision: String,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex_client::state::get_client(&state.client_state).await?;
    let parsed = parse_review_decision(&decision)?;
    client.respond_apply_patch_request(&request_token, parsed).await
}
