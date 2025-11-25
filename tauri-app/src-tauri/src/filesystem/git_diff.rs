use super::file_types::GitDiff;
use std::fs;
use std::path::Path;
use std::process::Command;

#[tauri::command]
pub async fn get_git_file_diff(file_path: String) -> Result<GitDiff, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() {
        return Err("File does not exist".to_string());
    }

    // Get current file content
    let current_content = match fs::read_to_string(&expanded_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("Failed to read current file: {}", e)),
    };

    // First check if we're in a git repository
    let git_check = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
        .output();

    let in_git_repo = match git_check {
        Ok(output) => output.status.success(),
        Err(_) => false,
    };

    if !in_git_repo {
        return Ok(GitDiff {
            original_content: String::new(),
            current_content,
            has_changes: false,
        });
    }

    // Use git diff to get the original content from the index/HEAD
    let git_show_output = Command::new("git")
        .arg("show")
        .arg(&format!(
            "HEAD:{}",
            expanded_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
        ))
        .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
        .output();

    // If that fails, try with the full relative path
    let output = if git_show_output.is_err() || !git_show_output.as_ref().unwrap().status.success()
    {
        // Get git root and calculate relative path
        let git_root_output = Command::new("git")
            .arg("rev-parse")
            .arg("--show-toplevel")
            .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
            .output();

        match git_root_output {
            Ok(root_output) if root_output.status.success() => {
                let git_root_string = String::from_utf8_lossy(&root_output.stdout);
                let git_root = git_root_string.trim();
                let git_root_path = Path::new(git_root);

                if let Ok(rel_path) = expanded_path.strip_prefix(git_root_path) {
                    Command::new("git")
                        .arg("show")
                        .arg(&format!("HEAD:{}", rel_path.to_string_lossy()))
                        .current_dir(git_root_path)
                        .output()
                } else {
                    git_show_output
                }
            }
            _ => git_show_output,
        }
    } else {
        git_show_output
    };

    let original_content = match output {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8_lossy(&output.stdout).to_string()
            } else {
                // If git show fails, it might be a new file or not in git
                String::new()
            }
        }
        Err(_) => {
            // Git not available or not a git repo
            return Ok(GitDiff {
                original_content: current_content.clone(),
                current_content,
                has_changes: false,
            });
        }
    };

    let has_changes = original_content != current_content;

    Ok(GitDiff {
        original_content,
        current_content,
        has_changes,
    })
}
