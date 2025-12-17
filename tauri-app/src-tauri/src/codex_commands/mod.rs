//! Tauri command adapters for codex-client
//!
//! This module provides thin wrappers around codex-client functions,
//! adapting them to work with Tauri's command system.

pub mod state;
pub mod events;
pub mod accounts;
pub mod check;
pub mod config;
pub mod conversation;
pub mod initialize;
pub mod listeners;
pub mod reviews;
pub mod session_files;

pub use state::CodexState;
pub use events::setup_event_bridge;

// Re-export all commands for tauri::generate_handler!
pub use accounts::*;
// pub use check::*; // check commands accessed via check:: prefix in lib.rs
pub use config::profile::*;
pub use config::project::*;
pub use config::provider::*;
pub use conversation::*;
pub use initialize::*;
pub use listeners::*;
pub use reviews::*;
pub use session_files::*;
