use dirs::home_dir;
use std::path::{Path, PathBuf};

/// Where a JSON client keeps its MCP config.
///
/// `path` is a project folder for project-capable clients (Cursor, VS Code),
/// the config file itself for `custom`, and ignored otherwise.
pub struct ClientConfig {
    pub path: PathBuf,
}

impl ClientConfig {
    pub fn new(name: &str, path: Option<&str>) -> Result<Self, String> {
        let home = home_dir().ok_or("Failed to get home directory")?;
        let project = path.filter(|p| !p.is_empty()).map(PathBuf::from);

        let path = match name {
            "claude" => Self::app_support_dir(&home).join("Claude/claude_desktop_config.json"),
            "cline" => Self::vscode_user_dir(&home)
                .join("globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"),
            "copilot" => match project {
                Some(dir) => dir.join(".vscode/mcp.json"),
                None => Self::vscode_user_dir(&home).join("mcp.json"),
            },
            "cursor" => project.unwrap_or(home).join(".cursor/mcp.json"),
            "mcphub" => home.join(".config/mcphub/servers.json"),
            "mcplinker" => home.join(".config/mcplinker/mcp.json"),
            "custom" => Self::custom_file(project)?,
            other => return Err(format!("Unknown client '{other}'")),
        };

        Ok(Self { path })
    }

    fn custom_file(path: Option<PathBuf>) -> Result<PathBuf, String> {
        let path = path.ok_or("Choose the config file for the custom client")?;
        if !path.is_dir() {
            return Ok(path);
        }
        // Older versions stored the folder that holds mcp.json.
        let legacy = path.join("mcp.json");
        if legacy.is_file() {
            Ok(legacy)
        } else {
            Err(format!("{} is a folder; choose the config file instead", path.display()))
        }
    }

    /// The per-user application data folder (`~/Library/Application Support`, `%APPDATA%`, `~/.config`).
    fn app_support_dir(home: &Path) -> PathBuf {
        if cfg!(target_os = "macos") {
            home.join("Library/Application Support")
        } else if cfg!(target_os = "windows") {
            home.join("AppData/Roaming")
        } else {
            home.join(".config")
        }
    }

    fn vscode_user_dir(home: &Path) -> PathBuf {
        Self::app_support_dir(home).join("Code/User")
    }

    pub fn get_path(&self) -> &Path {
        &self.path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn path_of(name: &str, path: Option<&str>) -> Result<PathBuf, String> {
        ClientConfig::new(name, path).map(|c| c.path)
    }

    #[test]
    fn copilot_uses_vscode_user_config_or_project_folder() {
        assert!(path_of("copilot", None).unwrap().ends_with("Code/User/mcp.json"));
        assert!(path_of("copilot", Some("")).unwrap().ends_with("Code/User/mcp.json"));
        assert_eq!(path_of("copilot", Some("/work/app")).unwrap(), PathBuf::from("/work/app/.vscode/mcp.json"));
    }

    #[test]
    fn cursor_uses_home_or_project_folder() {
        assert!(path_of("cursor", None).unwrap().ends_with(".cursor/mcp.json"));
        assert_eq!(path_of("cursor", Some("/work/app")).unwrap(), PathBuf::from("/work/app/.cursor/mcp.json"));
    }

    #[test]
    fn cline_lives_in_vscode_global_storage() {
        assert!(path_of("cline", None)
            .unwrap()
            .ends_with("Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"));
    }

    #[test]
    fn custom_takes_the_file_itself() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("servers.json");
        assert_eq!(path_of("custom", file.to_str()).unwrap(), file);
    }

    #[test]
    fn custom_requires_a_path() {
        assert!(path_of("custom", None).is_err());
        assert!(path_of("custom", Some("")).is_err());
    }

    #[test]
    fn custom_folder_falls_back_to_legacy_mcp_json_only_if_present() {
        let dir = tempdir().unwrap();
        assert!(path_of("custom", dir.path().to_str()).is_err());
        std::fs::write(dir.path().join("mcp.json"), "{}").unwrap();
        assert_eq!(path_of("custom", dir.path().to_str()).unwrap(), dir.path().join("mcp.json"));
    }

    #[test]
    fn unknown_client_is_an_error() {
        assert!(path_of("vscode", None).is_err());
    }
}
