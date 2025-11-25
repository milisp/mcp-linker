use calamine::{open_workbook, Data, Reader as CalamineReader, Xlsx};
use std::path::Path;

#[tauri::command]
pub async fn read_xlsx_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    let mut workbook: Xlsx<_> =
        open_workbook(&expanded_path).map_err(|e| format!("Failed to open XLSX file: {}", e))?;

    let mut content = String::new();

    // Get the first worksheet
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err("No worksheets found in XLSX file".to_string());
    }

    let sheet_name = &sheet_names[0];
    content.push_str(&format!(
        "Sheet: {}

",
        sheet_name
    ));

    if let Ok(range) = workbook.worksheet_range(sheet_name) {
        let mut row_count = 0;
        for row in range.rows() {
            if row_count >= 1000 {
                // Limit to first 1000 rows for performance
                content.push_str(&format!("... (truncated at {} rows)\n", row_count));
                break;
            }

            let row_data: Vec<String> = row
                .iter()
                .map(|cell| match cell {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    Data::Error(e) => format!("Error: {:?}", e),
                    Data::DateTime(dt) => format!("{}", dt),
                    Data::DateTimeIso(dt) => dt.clone(),
                    Data::DurationIso(d) => d.clone(),
                })
                .collect();

            content.push_str(&row_data.join("\t"));
            content.push('\n');
            row_count += 1;
        }
    }

    Ok(content)
}
