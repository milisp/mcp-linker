use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

// Reuse the McpServerConfig definition from crate::codex
use crate::codex::McpServerConfig;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CodexConfig {
    #[serde(default)]
    pub projects: HashMap<String, serde_json::Value>,
    #[serde(default, rename = "mcp_servers", alias = "mcpServers")]
    pub mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default, rename = "disabled_mcp_servers")]
    pub disabled_mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default)]
    pub model_providers: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub profiles: HashMap<String, serde_json::Value>,
}

/// `$CODEX_HOME/config.toml`, as Codex itself resolves it, else `~/.codex/config.toml`.
pub fn get_config_path() -> Result<PathBuf, String> {
    config_path_from(std::env::var_os("CODEX_HOME"), home_dir())
}

fn config_path_from(codex_home: Option<std::ffi::OsString>, home: Option<PathBuf>) -> Result<PathBuf, String> {
    match codex_home.filter(|dir| !dir.is_empty()) {
        Some(dir) => Ok(PathBuf::from(dir).join("config.toml")),
        None => Ok(home.ok_or("Failed to get home directory")?.join(".codex/config.toml")),
    }
}

#[cfg(test)]
mod tests {
    use super::config_path_from;
    use std::path::PathBuf;

    #[test]
    fn honors_codex_home_like_codex_does() {
        let home = Some(PathBuf::from("/home/u"));
        assert_eq!(config_path_from(Some("/opt/codex".into()), home.clone()).unwrap(), PathBuf::from("/opt/codex/config.toml"));
        assert_eq!(config_path_from(Some("".into()), home.clone()).unwrap(), PathBuf::from("/home/u/.codex/config.toml"));
        assert_eq!(config_path_from(None, home).unwrap(), PathBuf::from("/home/u/.codex/config.toml"));
        assert!(config_path_from(None, None).is_err());
    }
}
