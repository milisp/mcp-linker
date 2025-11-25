use super::file_types::FileEntry;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded_path = if path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };

    if !expanded_path.exists() || !expanded_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries = Vec::new();

    match fs::read_dir(&expanded_path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        let name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let is_directory = path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            fs::metadata(&path).ok().map(|m| m.len())
                        };

                        let extension = if is_directory {
                            None
                        } else {
                            path.extension()
                                .and_then(|ext| ext.to_str())
                                .map(|s| s.to_string())
                        };

                        entries.push(FileEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_directory,
                            size,
                            extension,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort directories first, then files
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
pub async fn get_default_directories() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;

    let default_dirs = vec![
        home.to_string_lossy().to_string(),
        home.join("Documents").to_string_lossy().to_string(),
        home.join("Downloads").to_string_lossy().to_string(),
        home.join("Pictures").to_string_lossy().to_string(),
        home.join("Movies").to_string_lossy().to_string(),
        home.join("Music").to_string_lossy().to_string(),
    ];

    Ok(default_dirs)
}

/// Determine if we should skip descending into a directory based on the exclude list.
fn should_skip_dir(entry: &DirEntry, exclude_folders: &[String]) -> bool {
    if let Some(name) = entry.file_name().to_str() {
        // Exact folder name match (e.g. "node_modules", ".git")
        exclude_folders.iter().any(|ex| ex == name)
    } else {
        false
    }
}

#[tauri::command]
pub async fn search_files(
    root: String,
    query: String,
    exclude_folders: Vec<String>,
    // Optional cap to avoid returning an extremely large result set
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    let expanded_root: PathBuf = if root.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&root[2..])
    } else {
        Path::new(&root).to_path_buf()
    };

    if !expanded_root.exists() || !expanded_root.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let lc_query = query.to_lowercase();
    // Reasonable default limit
    let limit = max_results.unwrap_or(2000);

    let mut results: Vec<FileEntry> = Vec::new();

    let walker = WalkDir::new(&expanded_root)
        .into_iter()
        .filter_entry(|e| !e.path_is_symlink() && !should_skip_dir(e, &exclude_folders));

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_e) => continue,
        };

        let path = entry.path();
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };

        // Match folders and files by name (case-insensitive)
        if file_name.to_lowercase().contains(&lc_query) {
            let is_directory = entry.file_type().is_dir();
            let size = if is_directory {
                None
            } else {
                fs::metadata(path).ok().map(|m| m.len())
            };
            let extension = if is_directory {
                None
            } else {
                path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|s| s.to_string())
            };

            results.push(FileEntry {
                name: file_name.to_string(),
                path: path.to_string_lossy().to_string(),
                is_directory,
                size,
                extension,
            });

            if results.len() >= limit {
                break;
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn canonicalize_path(path: String) -> Result<String, String> {
    let expanded = if path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };
    match std::fs::canonicalize(&expanded) {
        Ok(p) => Ok(p.to_string_lossy().to_string()),
        Err(_) => Ok(expanded.to_string_lossy().to_string()),
    }
}
