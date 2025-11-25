use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub staged: Vec<String>,
    pub modified: Vec<String>,
    pub untracked: Vec<String>,
    pub deleted: Vec<String>,
    pub renamed: Vec<String>,
    pub conflicted: Vec<String>,
}

#[tauri::command]
pub async fn get_git_status(directory: String) -> Result<GitStatus, String> {
    let expanded_path = if directory.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&directory[2..])
    } else {
        Path::new(&directory).to_path_buf()
    };

    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&expanded_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err("Not a git repository or git command failed".to_string());
    }

    let mut git_status = GitStatus {
        staged: Vec::new(),
        modified: Vec::new(),
        untracked: Vec::new(),
        deleted: Vec::new(),
        renamed: Vec::new(),
        conflicted: Vec::new(),
    };

    let status_output = String::from_utf8_lossy(&output.stdout);
    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }

        let status_code = &line[..2];
        let file_path = line[3..].to_string();

        match status_code {
            "??" => git_status.untracked.push(file_path),
            "A " | "AM" => git_status.staged.push(file_path),
            "M " => git_status.staged.push(file_path),
            " M" => git_status.modified.push(file_path),
            "MM" => git_status.modified.push(file_path),
            " D" => git_status.deleted.push(file_path),
            "D " => git_status.staged.push(file_path),
            "R " | "RM" => git_status.renamed.push(file_path),
            "UU" => git_status.conflicted.push(file_path),
            _ => {}
        }
    }

    Ok(git_status)
}
