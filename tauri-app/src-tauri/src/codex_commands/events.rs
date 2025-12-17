//! Event bridging - connects codex-client EventBus to Tauri events
//!
//! This module sets up subscriptions on the codex-client EventBus
//! and forwards them to Tauri's event system.

use codex_client::ClientState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// Setup event bridge between codex-client EventBus and Tauri events
///
/// This function subscribes to all codex-client events and forwards them
/// to Tauri's event system so the frontend can receive them.
pub fn setup_event_bridge<R: Runtime>(app: AppHandle<R>, client_state: Arc<ClientState>) {
    let event_bus = client_state.event_bus.clone();

    // Get the main window for emitting events
    let window = match app.webview_windows().values().next() {
        Some(w) => w.clone(),
        None => {
            log::error!("[EventBridge] No window found, events will not be forwarded");
            return;
        }
    };
    log::info!("[EventBridge] Using window: {}", window.label());

    // Bridge: codex:event
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:event";
        tauri::async_runtime::spawn(async move {
            log::info!("[EventBridge] Setting up subscription for: {}", event_name);
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_event, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data.clone()) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            } else {
                                log::debug!("[EventBridge] Successfully emitted: {}", event_name);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:auth-status
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:auth-status";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:login-complete
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:login-complete";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:exec-command-request
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:exec-command-request";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:apply-patch-request
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:apply-patch-request";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:backend-error
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:backend-error";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }

    // Bridge: codex:process-exited
    {
        let window = window.clone();
        let event_bus = event_bus.clone();
        let event_name = "codex:process-exited";
        tauri::async_runtime::spawn(async move {
            event_bus
                .subscribe(
                    event_name,
                    Arc::new(move |_, data| {
                        let window = window.clone();
                        let data = data.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(err) = window.emit(event_name, data) {
                                log::error!("Failed to emit {}: {}", event_name, err);
                            }
                        });
                        Ok(())
                    }),
                )
                .await;
        });
    }
}
