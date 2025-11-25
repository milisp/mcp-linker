use csv::Reader;
use std::path::Path;

#[tauri::command]
pub async fn read_csv_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    let file = std::fs::File::open(expanded_path)
        .map_err(|e| format!("Failed to open CSV file: {}", e))?;

    let mut reader = Reader::from_reader(file);
    let mut content = String::new();

    // Read headers if they exist
    if let Ok(headers) = reader.headers() {
        content.push_str(&headers.iter().collect::<Vec<_>>().join(","));
        content.push('\n');
    }

    // Read all records
    for (i, result) in reader.records().enumerate() {
        if i >= 1000 {
            // Limit to first 1000 rows for performance
            content.push_str(&format!("... (truncated at {} rows)\n", i));
            break;
        }

        match result {
            Ok(record) => {
                content.push_str(&record.iter().collect::<Vec<_>>().join(","));
                content.push('\n');
            }
            Err(e) => {
                content.push_str(&format!("Error reading row {}: {}", i, e));
            }
        }
    }

    Ok(content)
}
