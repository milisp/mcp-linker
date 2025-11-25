use pdf_extract::extract_text;
use std::path::Path;

#[tauri::command]
pub async fn read_pdf_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    match extract_text(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to extract PDF content: {}", e)),
    }
}
