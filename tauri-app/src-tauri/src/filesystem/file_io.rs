use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    // Check file size to prevent reading very large files
    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 1024 * 1024 {
            // 1MB limit
            return Err("File is too large to display".to_string());
        }
    }

    match fs::read_to_string(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    // Basic safety check: only allow writing to text files
    let extension = expanded_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    let is_text_file = match extension.as_deref() {
        Some("txt") | Some("md") | Some("json") | Some("xml") | Some("yaml") | Some("yml")
        | Some("js") | Some("jsx") | Some("ts") | Some("tsx") | Some("rs") | Some("py")
        | Some("java") | Some("cpp") | Some("c") | Some("h") | Some("css") | Some("html")
        | Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("log") => true,
        _ => false,
    };

    if !is_text_file {
        return Err("Only text files can be edited".to_string());
    }

    match fs::write(&expanded_path, content) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}