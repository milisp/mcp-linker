//! Copilot CLI keeps its servers in `mcp-config.json` and the names of disabled
//! ones in `settings.json` next to it (`disabledMcpServers`), which is what
//! `copilot mcp disable` writes. Entries stay in the config file either way.

use serde_json::{json, Value};
use std::path::{Path, PathBuf};

use super::file_io::{read_json_file, write_json_file};

const KEY: &str = "disabledMcpServers";

fn settings_path(config: &Path) -> PathBuf {
    config.with_file_name("settings.json")
}

/// Names disabled for the client whose servers live in `config`.
pub async fn read(config: &Path) -> Result<Vec<String>, String> {
    let settings = read_json_file(&settings_path(config)).await?;
    Ok(settings
        .get(KEY)
        .and_then(Value::as_array)
        .map(|names| names.iter().filter_map(Value::as_str).map(String::from).collect())
        .unwrap_or_default())
}

/// Adds or removes names from the list, keeping the rest of the settings file.
pub async fn set(config: &Path, names: &[&str], disabled: bool) -> Result<(), String> {
    let path = settings_path(config);
    let mut settings = read_json_file(&path).await?;
    if !settings.is_object() {
        return Err(format!("{} is not a JSON object", path.display()));
    }
    let mut list = read(config).await?;
    let before = list.clone();
    list.retain(|name| !names.contains(&name.as_str()));
    if disabled {
        list.extend(names.iter().map(|name| name.to_string()));
    }
    if list == before {
        return Ok(());
    }
    settings[KEY] = json!(list);
    write_json_file(&path, &settings).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn set_keeps_other_settings_and_order() {
        let dir = tempdir().unwrap();
        let config = dir.path().join("mcp-config.json");
        let settings = dir.path().join("settings.json");
        write_json_file(&settings, &json!({ "model": "x", KEY: ["a"] })).await.unwrap();

        set(&config, &["b"], true).await.unwrap();
        set(&config, &["a"], false).await.unwrap();
        assert_eq!(read(&config).await.unwrap(), ["b"]);
        assert_eq!(read_json_file(&settings).await.unwrap()["model"], "x");
    }

    #[tokio::test]
    async fn missing_settings_file_means_nothing_disabled_and_is_not_created_for_a_no_op() {
        let dir = tempdir().unwrap();
        let config = dir.path().join("mcp-config.json");
        assert!(read(&config).await.unwrap().is_empty());
        set(&config, &["a"], false).await.unwrap();
        assert!(!dir.path().join("settings.json").exists());
    }
}
