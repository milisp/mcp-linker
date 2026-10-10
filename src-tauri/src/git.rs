use anyhow::Result;
use dirs::home_dir;
use std::fs;
use std::process::Command;
use url::Url;

#[tauri::command]
pub async fn git_clone(url: String) -> Result<String, String> {
    // Check if the URL starts with github.com
    let parsed_url = Url::parse(&url).map_err(|_| "Invalid URL format".to_string())?;

    if parsed_url.domain() != Some("github.com") {
        return Err("Only GitHub repositories are supported.".to_string());
    }

    // path_segments should be /owner/repo
    let segments: Vec<&str> = parsed_url
        .path_segments()
        .ok_or("URL missing path")?
        .filter(|s| !s.is_empty())
        .collect();

    if segments.len() != 2 {
        return Err("Expected format: https://github.com/owner/repo".to_string());
    }

    let owner = segments[0];
    let repo = segments[1];

    // Construct target path: ~/.cache/mcp-linker/owner/repo
    let target_dir = home_dir()
        .ok_or("Cannot determine home directory")
        .map_err(|e| e.to_string())?
        .join(".cache/mcp-linker")
        .join(owner)
        .join(repo);

    tauri::async_runtime::spawn_blocking(move || {
        if target_dir.exists() {
            return Ok(format!(
                "Repository already exists at {}",
                target_dir.display()
            ));
        }

        // Create parent directory ~/.cache/mcp-linker/owner
        if let Some(parent) = target_dir.parent()
            && !parent.exists()
        {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        // Clone the repository (append .git if not already present)
        let full_url = format!("{}.git", url.trim_end_matches(".git")); // Avoid double .git

        let output = Command::new("git")
            .arg("clone")
            .arg(&full_url)
            .arg(&target_dir)
            .output()
            .map_err(|e| format!("Failed to execute git: {}", e))?;

        if output.status.success() {
            Ok(format!("Cloned to {}", target_dir.display()))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Clone failed: {}", stderr))
        }
    })
    .await
    .map_err(|e| format!("Thread error: {}", e))?
}
