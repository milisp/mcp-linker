use serde_json::{json, Value};
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn read_app_settings(app: AppHandle) -> Result<Value, String> {
    let path = app.path().app_config_dir().map_err(|e| e.to_string())?.join("settings.json");
    if !path.exists() { return Ok(json!({})); }
    serde_json::from_str(&fs::read_to_string(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project_preferences(app: AppHandle, preferences: Value) -> Result<(), String> {
    if !preferences.is_object() { return Err("Project preferences must be an object".into()); }
    let directory = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let mut settings = read_app_settings(app)?;
    if !settings.is_object() { return Err("settings.json must contain an object".into()); }
    settings["projectPreferences"] = preferences;
    let temporary = directory.join("settings.json.tmp");
    fs::write(&temporary, serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(temporary, directory.join("settings.json")).map_err(|e| e.to_string())
}
