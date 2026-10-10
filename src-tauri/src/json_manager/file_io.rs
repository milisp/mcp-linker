use serde_json::{json, Value};
use std::io::ErrorKind;
use std::path::Path;
use tokio::fs;
use tokio::task;

/// Read JSON file asynchronously
pub async fn read_json_file(path: &Path) -> Result<Value, String> {
    let path_buf = path.to_path_buf();
    let content_result = fs::read_to_string(&path_buf).await;

    match content_result {
        Ok(content) => task::spawn_blocking(move || {
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))
        })
        .await
        .map_err(|e| format!("Failed to run blocking task for JSON parsing: {}", e))?,
        Err(e) => {
            if e.kind() == ErrorKind::NotFound {
                Ok(json!({})) // Return empty JSON for Not Found
            } else {
                Err(format!("Failed to read file: {}", e))
            }
        }
    }
}

/// Write JSON file asynchronously
pub async fn write_json_file(path: &Path, content: &Value) -> Result<(), String> {
    let path_buf = path.to_path_buf();
    let content_cloned = content.clone(); // Clone for the blocking task

    // Ensure directory exists
    if let Some(parent) = path_buf.parent()
        && !parent.exists()
    {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Serialize JSON in a blocking task
    let json_string_result = task::spawn_blocking(move || {
        serde_json::to_string_pretty(&content_cloned)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))
    })
    .await
    .map_err(|e| format!("Failed to run blocking task for JSON serialization: {}", e))?;

    let json_string = json_string_result?; // Handle the inner Result from the blocking task

    // Write the JSON file asynchronously
    fs::write(&path_buf, json_string)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}
