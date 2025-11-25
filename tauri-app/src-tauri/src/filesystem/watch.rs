use crate::state::WatchState;
use notify::{recommended_watcher, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Debug, Clone)]
pub struct FsChangePayload {
    pub path: String,
    pub kind: String,
}

fn expand_path(input: &str) -> Result<PathBuf, String> {
    if input.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        Ok(home.join(&input[2..]))
    } else {
        Ok(Path::new(input).to_path_buf())
    }
}

fn kind_to_string(kind: &EventKind) -> String {
    use notify::event::*;
    match kind {
        EventKind::Create(CreateKind::Any) => "create".into(),
        EventKind::Create(_) => "create".into(),
        EventKind::Modify(ModifyKind::Any) => "modify".into(),
        EventKind::Modify(_) => "modify".into(),
        EventKind::Remove(RemoveKind::Any) => "remove".into(),
        EventKind::Remove(_) => "remove".into(),
        EventKind::Access(_) => "access".into(),
        EventKind::Other => "other".into(),
        EventKind::Any => "any".into(),
    }
}

#[tauri::command]
pub async fn start_watch_directory(
    app: AppHandle,
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    let abs = expand_path(&folder_path)?;
    if !abs.exists() || !abs.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let key = match std::fs::canonicalize(&abs) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => abs.to_string_lossy().to_string(),
    };

    // If already watching, ignore
    {
        let mut watchers = state.watchers.lock().await;
        if let Some((_existing, count)) = watchers.get_mut(&key) {
            *count += 1;
            return Ok(());
        }
    }

    let app_for_cb = app.clone();
    // Create a new watcher with a callback that emits tauri event
    let mut watcher: RecommendedWatcher =
        recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Send one event per affected path
                for p in event.paths.iter() {
                    let payload = FsChangePayload {
                        path: p.to_string_lossy().to_string(),
                        kind: kind_to_string(&event.kind),
                    };
                    let _ = app_for_cb.emit("fs_change", &payload);
                }
            }
        })
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&abs, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to start watcher: {}", e))?;

    let mut watchers = state.watchers.lock().await;
    watchers.insert(key, (watcher, 1));
    Ok(())
}

#[tauri::command]
pub async fn stop_watch_directory(
    _app: AppHandle,
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    let abs = expand_path(&folder_path)?;
    let key = match std::fs::canonicalize(&abs) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => abs.to_string_lossy().to_string(),
    };

    let mut watchers = state.watchers.lock().await;
    if let Some((_, count)) = watchers.get_mut(&key) {
        if *count > 1 {
            *count -= 1;
            return Ok(());
        }
    }
    if let Some((mut watcher, _)) = watchers.remove(&key) {
        let _ = watcher.unwatch(&abs);
    }
    Ok(())
}
