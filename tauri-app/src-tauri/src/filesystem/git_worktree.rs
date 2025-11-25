use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::fs;

/// Try to locate the git repository root starting from `start_dir` (or the
/// current process directory if None) by calling `git rev-parse --show-toplevel`.
fn find_git_root(start_dir: Option<&Path>) -> Option<PathBuf> {
    let dir = start_dir
        .map(|p| p.to_path_buf())
        .or_else(|| std::env::current_dir().ok())?;

    let output = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(&dir)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }
    let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if root.is_empty() {
        return None;
    }
    Some(PathBuf::from(root))
}

fn expand_tilde(path: &str) -> PathBuf {
    if let Some(stripped) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(stripped);
        }
    }
    PathBuf::from(path)
}

fn find_repo_root_from_gitdir(gitdir: &Path) -> Option<PathBuf> {
    let mut current = Some(gitdir);
    while let Some(dir) = current {
        if dir.file_name().and_then(|name| name.to_str()) == Some(".git") {
            return dir.parent().map(|parent| parent.to_path_buf());
        }
        current = dir.parent();
    }
    None
}

fn resolve_main_repo_root_for_worktree(worktree_path: &Path) -> Option<PathBuf> {
    let dot_git = worktree_path.join(".git");

    if dot_git.is_file() {
        let contents = fs::read_to_string(&dot_git).ok()?;
        let gitdir_value = contents
            .lines()
            .filter_map(|line| line.trim().strip_prefix("gitdir:"))
            .map(str::trim)
            .next()?;

        let gitdir_path = Path::new(gitdir_value);
        let resolved_gitdir = if gitdir_path.is_absolute() {
            gitdir_path.to_path_buf()
        } else {
            worktree_path.join(gitdir_path)
        };

        return find_repo_root_from_gitdir(&resolved_gitdir);
    }

    if dot_git.is_dir() {
        return Some(worktree_path.to_path_buf());
    }

    None
}

#[derive(Serialize)]
pub struct PrepareWorktreeResult {
    pub prepared: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[tauri::command]
pub async fn prepare_git_worktree(turn_id: String, directory: Option<String>) -> Result<PrepareWorktreeResult, String> {
    // Resolve a starting directory if provided
    let start_dir = directory
        .as_deref()
        .map(expand_tilde);
    let start_dir_ref = start_dir.as_deref();

    let git_root = match find_git_root(start_dir_ref) {
        Some(p) => p,
        None => {
            return Ok(PrepareWorktreeResult {
                prepared: false,
                path: None,
                reason: Some("Not a git repository".into()),
            })
        }
    };

    // Place worktrees in a dedicated directory under the user's home folder
    let base = expand_tilde("~/.codexia/worktrees");

    // Ensure base directory exists
    if let Err(e) = std::fs::create_dir_all(&base) {
        return Err(format!("Failed to create worktrees base directory: {}", e));
    }

    let worktree_path = base.join(format!("codex-turn-{}", turn_id));
    if worktree_path.exists() {
        return Ok(PrepareWorktreeResult {
            prepared: true,
            path: Some(worktree_path.to_string_lossy().to_string()),
            reason: None,
        });
    }

    println!("worktree path {:?}", worktree_path);

    // Add a detached worktree at current HEAD
    let status = Command::new("git")
        .args(["worktree", "add", "--detach", worktree_path.to_string_lossy().as_ref()])
        .current_dir(&git_root)
        .status()
        .map_err(|e| format!("Failed to execute git worktree add: {}", e))?;

    if !status.success() {
        return Err("git worktree add failed".into());
    }

    Ok(PrepareWorktreeResult {
        prepared: true,
        path: Some(worktree_path.to_string_lossy().to_string()),
        reason: None,
    })
}

#[derive(Serialize)]
pub struct CommitResult {
    pub committed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Stage all changes and commit with the provided message in the repository
/// resolved from `directory` (or current directory if None).
#[tauri::command]
pub async fn git_commit_changes(message: String, directory: Option<String>) -> Result<CommitResult, String> {
    let start_dir = directory
        .as_deref()
        .map(expand_tilde);
    let start_dir_ref = start_dir.as_deref();

    let git_root = match find_git_root(start_dir_ref) {
        Some(p) => p,
        None => {
            return Ok(CommitResult {
                committed: false,
                reason: Some("Not a git repository".into()),
            })
        }
    };

    // Stage all changes
    let add_status = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&git_root)
        .status()
        .map_err(|e| format!("Failed to execute git add: {}", e))?;
    if !add_status.success() {
        return Err("git add failed".into());
    }

    // Check if there is anything to commit
    let diff_status = Command::new("git")
        .args(["diff", "--cached", "--quiet"])
        .current_dir(&git_root)
        .status()
        .map_err(|e| format!("Failed to execute git diff --cached: {}", e))?;

    if diff_status.success() {
        // Exit code 0 means no staged changes
        return Ok(CommitResult {
            committed: false,
            reason: Some("Nothing to commit".into()),
        });
    }

    // Commit the staged changes
    let commit_status = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&git_root)
        .status()
        .map_err(|e| format!("Failed to execute git commit: {}", e))?;

    if !commit_status.success() {
        return Err("git commit failed".into());
    }

    Ok(CommitResult {
        committed: true,
        reason: None,
    })
}

/// Apply a reverse unified diff to the repository at `directory` (or current directory).
#[tauri::command]
pub async fn apply_reverse_patch(unified_diff: String, directory: Option<String>) -> Result<bool, String> {
    let start_dir = directory
        .as_deref()
        .map(expand_tilde);
    let start_dir_ref = start_dir.as_deref();

    let git_root = match find_git_root(start_dir_ref) {
        Some(p) => p,
        None => return Err("Not a git repository".into()),
    };

    let mut child = Command::new("git")
        .args(["apply", "--reverse", "--whitespace=nowarn"]) // be lenient on whitespace
        .current_dir(&git_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn git apply: {}", e))?;

    use std::io::Write;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(unified_diff.as_bytes())
            .map_err(|e| format!("Failed to write patch to stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for git apply: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git apply --reverse failed: {}", err));
    }

    Ok(true)
}

#[tauri::command]
pub async fn commit_changes_to_worktree(turn_id: String, message: String, directory: Option<String>) -> Result<PrepareWorktreeResult, String> {
    // Resolve repository root
    let start_dir = directory
        .as_deref()
        .map(expand_tilde);
    let start_dir_ref = start_dir.as_deref();

    let git_root = match find_git_root(start_dir_ref) {
        Some(p) => p,
        None => {
            return Ok(PrepareWorktreeResult {
                prepared: false,
                path: None,
                reason: Some("Not a git repository".into()),
            })
        }
    };

    // Ensure worktrees base
    let base = expand_tilde("~/.codexia/worktrees");
    std::fs::create_dir_all(&base)
        .map_err(|e| format!("Failed to create worktrees base directory: {}", e))?;

    let worktree_path = base.join(format!("codex-turn-{}", turn_id));

    // If not exists, add a detached worktree at current HEAD
    if !worktree_path.exists() {
        let status = Command::new("git")
            .args(["worktree", "add", "--detach", worktree_path.to_string_lossy().as_ref()])
            .current_dir(&git_root)
            .status()
            .map_err(|e| format!("Failed to execute git worktree add: {}", e))?;

        if !status.success() {
            return Err("git worktree add failed".into());
        }
    }

    // Compute the diff of working tree changes against HEAD in the main repo
    let diff_output = Command::new("git")
        .args(["diff", "HEAD"])
        .current_dir(&git_root)
        .output()
        .map_err(|e| format!("Failed to execute git diff HEAD: {}", e))?;

    if !diff_output.status.success() {
        return Err("git diff HEAD failed".into());
    }
    let patch = String::from_utf8_lossy(&diff_output.stdout).to_string();

    // Also collect untracked files so we can include new files
    let ls_others = Command::new("git")
        .args(["ls-files", "--others", "--exclude-standard"])
        .current_dir(&git_root)
        .output()
        .map_err(|e| format!("Failed to execute git ls-files: {}", e))?;
    if !ls_others.status.success() {
        return Err("git ls-files failed".into());
    }
    let untracked: Vec<String> = String::from_utf8_lossy(&ls_others.stdout)
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // If there is neither a patch nor untracked files, nothing to do
    if patch.trim().is_empty() && untracked.is_empty() {
        return Ok(PrepareWorktreeResult {
            prepared: true,
            path: Some(worktree_path.to_string_lossy().to_string()),
            reason: Some("No changes to commit".into()),
        });
    }

    // Apply the patch (tracked modifications/deletions) in the worktree
    if !patch.trim().is_empty() {
        let mut apply_child = Command::new("git")
            .args(["apply", "--index", "--whitespace=nowarn"]) // stage changes while applying
            .current_dir(&worktree_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn git apply in worktree: {}", e))?;

        use std::io::Write;
        if let Some(mut stdin) = apply_child.stdin.take() {
            stdin
                .write_all(patch.as_bytes())
                .map_err(|e| format!("Failed to write patch to worktree stdin: {}", e))?;
        }
        let apply_out = apply_child
            .wait_with_output()
            .map_err(|e| format!("Failed to wait for git apply in worktree: {}", e))?;

        if !apply_out.status.success() {
            let err = String::from_utf8_lossy(&apply_out.stderr).to_string();
            return Err(format!("git apply in worktree failed: {}", err));
        }
    }

    // Copy untracked files into the worktree so they can be added and committed
    for rel in &untracked {
        let src = git_root.join(rel);
        let dst = worktree_path.join(rel);
        if let Some(parent) = dst.parent() { fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dirs for {}: {}", dst.display(), e))?; }
        // Only copy regular files; skip if source is not a file
        if src.is_file() {
            fs::copy(&src, &dst).map_err(|e| format!("Failed to copy {} -> {}: {}", src.display(), dst.display(), e))?;
        }
    }

    // Ensure all new files are staged in the worktree
    let add_status = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&worktree_path)
        .status()
        .map_err(|e| format!("Failed to execute git add in worktree: {}", e))?;
    if !add_status.success() {
        return Err("git add in worktree failed".into());
    }

    // Commit in worktree
    let commit_status = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&worktree_path)
        .status()
        .map_err(|e| format!("Failed to execute git commit in worktree: {}", e))?;

    if !commit_status.success() {
        return Err("git commit in worktree failed".into());
    }

    Ok(PrepareWorktreeResult {
        prepared: true,
        path: Some(worktree_path.to_string_lossy().to_string()),
        reason: None,
    })
}

#[derive(Serialize)]
pub struct DeleteWorktreeResult {
    pub removed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[tauri::command]
pub async fn delete_git_worktree(turn_id: String, directory: Option<String>) -> Result<DeleteWorktreeResult, String> {
    let start_dir = directory
        .as_deref()
        .map(expand_tilde);
    let start_dir_ref = start_dir.as_deref();

    let git_root = match find_git_root(start_dir_ref) {
        Some(p) => p,
        None => {
            return Ok(DeleteWorktreeResult {
                removed: false,
                path: None,
                reason: Some("Not a git repository".into()),
            })
        }
    };

    let base = expand_tilde("~/.codexia/worktrees");
    let worktree_path = base.join(format!("codex-turn-{}", turn_id));

    if !worktree_path.exists() {
        return Ok(DeleteWorktreeResult {
            removed: false,
            path: Some(worktree_path.to_string_lossy().to_string()),
            reason: Some("Worktree does not exist".into()),
        });
    }

    let remove_root = resolve_main_repo_root_for_worktree(&worktree_path).unwrap_or_else(|| git_root.clone());

    let status = Command::new("git")
        .args(["worktree", "remove", "--force", worktree_path.to_string_lossy().as_ref()])
        .current_dir(&remove_root)
        .status()
        .map_err(|e| format!("Failed to execute git worktree remove: {}", e))?;

    if !status.success() {
        return Err("git worktree remove failed".into());
    }

    if let Err(err) = fs::remove_dir_all(&worktree_path) {
        if err.kind() != std::io::ErrorKind::NotFound {
            return Err(format!("Failed to remove worktree directory: {}", err));
        }
    }

    Ok(DeleteWorktreeResult {
        removed: true,
        path: Some(worktree_path.to_string_lossy().to_string()),
        reason: None,
    })
}
