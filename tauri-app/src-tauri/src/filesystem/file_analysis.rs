use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn calculate_file_tokens(file_path: String) -> Result<Option<u32>, String> {
    let path = Path::new(&file_path);

    if !path.exists() || path.is_dir() {
        return Ok(None);
    }

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    // Only calculate tokens for text, image, audio, and document files
    let is_supported = match extension.as_deref() {
        Some("txt") | Some("md") | Some("rs") | Some("js") | Some("ts") | Some("tsx")
        | Some("jsx") | Some("py") | Some("java") | Some("cpp") | Some("c") | Some("h")
        | Some("css") | Some("html") | Some("json") | Some("xml") | Some("yaml") | Some("yml")
        | Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("png") | Some("jpg")
        | Some("jpeg") | Some("gif") | Some("webp") | Some("mp3") | Some("wav") | Some("flac")
        | Some("ogg") | Some("pdf") | Some("csv") | Some("xlsx") => true,
        _ => false,
    };

    if !is_supported {
        return Ok(None);
    }

    // For now, return a simple estimation based on file size
    // In a real implementation, you would use tiktoken-rs here
    match fs::metadata(path) {
        Ok(metadata) => {
            let size = metadata.len();
            // Rough estimation: ~4 characters per token for text files
            let estimated_tokens = match extension.as_deref() {
                Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("webp") => {
                    // Image tokens estimation (very rough)
                    (size / 1000) as u32 + 100
                }
                Some("mp3") | Some("wav") | Some("flac") | Some("ogg") => {
                    // Audio tokens estimation (very rough)
                    (size / 10000) as u32 + 50
                }
                Some("pdf") => {
                    // PDF tokens estimation (rough, based on compressed text)
                    (size / 8) as u32 + 100
                }
                Some("csv") => {
                    // CSV tokens estimation (similar to text but more structured)
                    (size / 5) as u32
                }
                Some("xlsx") => {
                    // XLSX tokens estimation (compressed format)
                    (size / 15) as u32 + 200
                }
                _ => {
                    // Text files
                    (size / 4) as u32
                }
            };
            Ok(Some(estimated_tokens))
        }
        Err(_) => Ok(None),
    }
}
