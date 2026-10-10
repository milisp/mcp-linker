use dirs::home_dir;
use std::path::{Path, PathBuf};

pub struct ClientConfig {
    pub path: PathBuf,
}

impl ClientConfig {
    pub fn new(name: &str, path: Option<&str>) -> Self {
        let home = home_dir().expect("Failed to get home directory");

        let path = match (name, path) {
            ("claude", _) => Self::claude_config_path(&home),
            ("cline", _) => Self::cline_config_path(&home),
            ("copilot", Some(base_path)) if !base_path.is_empty() => {
                PathBuf::from(base_path).join(".vscode/mcp.json")
            }
            ("copilot", _) => home.join(".vscode/mcp.json"),
            ("cursor", Some(base_path)) if !base_path.is_empty() => {
                PathBuf::from(base_path).join(".cursor/mcp.json")
            }
            ("cursor", _) => home.join(".cursor/mcp.json"),
            ("mcphub", _) => home.join(".config/mcphub/servers.json"),
            ("mcplinker", _) => home.join(".config/mcplinker/mcp.json"),
            (_, Some(path_str)) if !path_str.is_empty() => {
                let given_path = PathBuf::from(path_str);
                if given_path.is_file() || given_path.extension().is_some_and(|ext| ext == "json") {
                    given_path
                } else {
                    given_path.join("mcp.json")
                }
            }
            _ => PathBuf::new(),
        };

        Self { path }
    }

    fn claude_config_path(home: &Path) -> PathBuf {
        if cfg!(target_os = "macos") {
            home.join("Library/Application Support/Claude/claude_desktop_config.json")
        } else if cfg!(target_os = "windows") {
            home.join("AppData/Roaming/Claude/claude_desktop_config.json")
        } else {
            PathBuf::new()
        }
    }

    fn vscode_global_storage_path(home: &Path, extension_id: &str, filename: &str) -> PathBuf {
        let base_path = if cfg!(target_os = "macos") {
            home.join("Library/Application Support/Code/User/globalStorage")
        } else if cfg!(target_os = "windows") {
            home.join("AppData/Roaming/Code/User/globalStorage")
        } else if cfg!(target_os = "linux") {
            home.join(".config/Code/User/globalStorage")
        } else {
            return PathBuf::new();
        };

        base_path.join(extension_id).join("settings").join(filename)
    }

    fn cline_config_path(home: &Path) -> PathBuf {
        Self::vscode_global_storage_path(home, "saoudrizwan.claude-dev", "cline_mcp_settings.json")
    }

    pub fn get_path(&self) -> &Path {
        &self.path
    }
}
