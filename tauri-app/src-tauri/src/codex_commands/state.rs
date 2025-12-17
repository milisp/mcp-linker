//! Tauri state wrapper for codex-client
//!
//! Wraps ClientState in a Tauri-managed state container

use codex_client::ClientState;
use std::sync::Arc;

/// Tauri-managed state wrapper
pub struct CodexState {
    pub client_state: Arc<ClientState>,
}

impl CodexState {
    pub fn new() -> Self {
        Self {
            client_state: Arc::new(ClientState::new()),
        }
    }
}

impl Default for CodexState {
    fn default() -> Self {
        Self::new()
    }
}
