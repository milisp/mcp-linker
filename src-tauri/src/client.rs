use crate::clients::{self, Location, Storage};
use crate::json_manager::file_io::parse_jsonc;
use dirs::home_dir;
use serde_json::{json, Value};
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
        let path = Self::resolve(&home, name, path)?;
        if name == "copilot" && path.ends_with("Code/User/mcp.json") {
            let marker = home.join(".config/mcplinker/copilot-user-config-migrated");
            if let Err(e) = migrate_legacy_copilot(&home.join(".vscode/mcp.json"), &path, &marker) {
                eprintln!("[Copilot] legacy config migration skipped: {e}");
            }
        }
        Ok(Self { path })
    }

    /// Pure path lookup; `new` adds the one-time Copilot migration on top.
    fn resolve(home: &Path, name: &str, path: Option<&str>) -> Result<PathBuf, String> {
        let client = clients::find(name).ok_or_else(|| format!("Unknown client '{name}'"))?;
        if client.storage != Storage::Json {
            return Err(format!("{} does not use a JSON config file", client.label));
        }
        let project = path.filter(|p| !p.is_empty()).map(PathBuf::from);
        if client.location == Location::File {
            return Self::custom_file(project);
        }
        if let (Some(dir), Some(file)) = (&project, client.project_file) {
            return Ok(dir.join(file));
        }
        Ok(match name {
            "claude" => Self::app_support_dir(home).join("Claude/claude_desktop_config.json"),
            "cline" => Self::vscode_user_dir(home)
                .join("globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"),
            "copilot" => Self::vscode_user_dir(home).join("mcp.json"),
            "copilot_cli" => Self::copilot_home(home, std::env::var_os("COPILOT_HOME")).join("mcp-config.json"),
            "cursor" => home.join(".cursor/mcp.json"),
            "mcphub" => home.join(".config/mcphub/servers.json"),
            "mcplinker" => home.join(".config/mcplinker/mcp.json"),
            other => return Err(format!("No user config location for '{other}'")),
        })
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

    /// `$COPILOT_HOME`, as Copilot CLI itself resolves it, else `~/.copilot`.
    fn copilot_home(home: &Path, copilot_home: Option<std::ffi::OsString>) -> PathBuf {
        copilot_home.filter(|dir| !dir.is_empty()).map_or_else(|| home.join(".copilot"), PathBuf::from)
    }

    fn vscode_user_dir(home: &Path) -> PathBuf {
        Self::app_support_dir(home).join("Code/User")
    }

    pub fn get_path(&self) -> &Path {
        &self.path
    }
}

/// mcp-linker used to keep Copilot's user servers in ~/.vscode/mcp.json, which
/// VS Code only reads when the home folder is opened as a workspace. Copy them
/// once into the real user config. Entries already there win, and the old file
/// is left alone since it may still be that workspace's config.
fn migrate_legacy_copilot(legacy: &Path, user: &Path, marker: &Path) -> Result<(), String> {
    if marker.exists() || !legacy.is_file() {
        return Ok(());
    }
    let read = |path: &Path| -> Result<Value, String> {
        match std::fs::read_to_string(path) {
            Ok(text) => parse_jsonc(&text).map_err(|e| format!("{}: {e}", path.display())),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
            Err(e) => Err(format!("{}: {e}", path.display())),
        }
    };
    let old = read(legacy)?;
    let mut new = read(user)?;
    if !new.is_object() {
        return Err(format!("{} is not a JSON object", user.display()));
    }

    let known = |new: &Value, name: &str| {
        ["servers", "__disabled"]
            .iter()
            .any(|section| new.get(*section).and_then(|s| s.get(name)).is_some())
    };
    let mut changed = false;
    for section in ["servers", "__disabled"] {
        let Some(entries) = old.get(section).and_then(Value::as_object) else { continue };
        for (name, config) in entries {
            if known(&new, name) {
                continue;
            }
            if !new[section].is_object() {
                new[section] = json!({});
            }
            new[section][name] = config.clone();
            changed = true;
        }
    }
    // `${input:id}` placeholders in the copied servers need their input definitions.
    if let Some(inputs) = old.get("inputs").and_then(Value::as_array) {
        if !new["inputs"].is_array() {
            new["inputs"] = json!([]);
        }
        let list = new["inputs"].as_array_mut().unwrap();
        for input in inputs {
            if !list.iter().any(|have| have.get("id").is_some() && have.get("id") == input.get("id")) {
                list.push(input.clone());
                changed = true;
            }
        }
    }

    let write = |path: &Path, text: String| -> Result<(), String> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
        }
        std::fs::write(path, text).map_err(|e| format!("{}: {e}", path.display()))
    };
    if changed {
        write(user, serde_json::to_string_pretty(&new).map_err(|e| e.to_string())?)?;
    }
    write(marker, format!("migrated {} into {}\n", legacy.display(), user.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    // Never touch the real home: `new` would run the Copilot migration there.
    fn path_of(name: &str, path: Option<&str>) -> Result<PathBuf, String> {
        ClientConfig::resolve(Path::new("/home/test"), name, path)
    }

    #[test]
    fn copilot_uses_vscode_user_config_or_project_folder() {
        assert!(path_of("copilot", None).unwrap().ends_with("Code/User/mcp.json"));
        assert!(path_of("copilot", Some("")).unwrap().ends_with("Code/User/mcp.json"));
        assert_eq!(path_of("copilot", Some("/work/app")).unwrap(), PathBuf::from("/work/app/.vscode/mcp.json"));
    }

    #[test]
    fn copilot_cli_uses_only_its_user_config() {
        let user = path_of("copilot_cli", None).unwrap();
        assert!(user.ends_with("mcp-config.json"));
        assert_eq!(path_of("copilot_cli", Some("/work/app")).unwrap(), user);
    }

    #[test]
    fn copilot_cli_honors_copilot_home() {
        let home = Path::new("/home/test");
        assert_eq!(ClientConfig::copilot_home(home, Some("/opt/copilot".into())), PathBuf::from("/opt/copilot"));
        assert_eq!(ClientConfig::copilot_home(home, Some("".into())), PathBuf::from("/home/test/.copilot"));
        assert_eq!(ClientConfig::copilot_home(home, None), PathBuf::from("/home/test/.copilot"));
    }

    #[test]
    fn cursor_uses_home_or_project_folder() {
        assert_eq!(path_of("cursor", None).unwrap(), PathBuf::from("/home/test/.cursor/mcp.json"));
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

    #[test]
    fn non_json_clients_have_no_config_file() {
        assert!(path_of("codex", None).is_err());
        assert!(path_of("claude_code", Some("/work/app")).is_err());
    }

    #[test]
    fn every_json_client_resolves_a_user_path() {
        for client in clients::CLIENTS {
            if client.storage == Storage::Json && client.location != Location::File {
                assert!(path_of(client.id, None).is_ok(), "{}", client.id);
            }
        }
    }

    mod legacy_copilot {
        use super::super::migrate_legacy_copilot;
        use serde_json::{json, Value};
        use std::path::{Path, PathBuf};
        use tempfile::{tempdir, TempDir};

        struct Paths { _dir: TempDir, legacy: PathBuf, user: PathBuf, marker: PathBuf }

        fn paths() -> Paths {
            let dir = tempdir().unwrap();
            let root = dir.path().to_path_buf();
            Paths {
                legacy: root.join("home/.vscode/mcp.json"),
                user: root.join("support/Code/User/mcp.json"),
                marker: root.join("home/.config/mcplinker/marker"),
                _dir: dir,
            }
        }

        fn write(path: &Path, value: Value) {
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, value.to_string()).unwrap();
        }

        fn read(path: &Path) -> Value {
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
        }

        #[test]
        fn copies_servers_disabled_and_inputs_into_a_new_user_config() {
            let p = paths();
            write(&p.legacy, json!({
                "servers": { "a": { "type": "stdio", "command": "a" } },
                "__disabled": { "off": { "command": "off" } },
                "inputs": [{ "id": "token", "type": "promptString" }]
            }));

            migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).unwrap();

            let user = read(&p.user);
            assert_eq!(user["servers"]["a"]["command"], "a");
            assert_eq!(user["__disabled"]["off"]["command"], "off");
            assert_eq!(user["inputs"][0]["id"], "token");
            assert!(p.marker.exists());
            assert!(p.legacy.exists(), "the legacy file stays in place");
        }

        #[test]
        fn keeps_existing_user_entries_and_inputs() {
            let p = paths();
            write(&p.legacy, json!({
                "servers": { "a": { "command": "old" }, "b": { "command": "b" }, "off": { "command": "x" } },
                "inputs": [{ "id": "token", "description": "old" }, { "id": "other" }]
            }));
            write(&p.user, json!({
                "servers": { "a": { "command": "new" } },
                "__disabled": { "off": { "command": "kept" } },
                "inputs": [{ "id": "token", "description": "new" }]
            }));

            migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).unwrap();

            let user = read(&p.user);
            assert_eq!(user["servers"]["a"]["command"], "new");
            assert_eq!(user["servers"]["b"]["command"], "b");
            assert!(user["servers"].get("off").is_none(), "a disabled entry with that name already exists");
            assert_eq!(user["inputs"], json!([{ "id": "token", "description": "new" }, { "id": "other" }]));
        }

        #[test]
        fn runs_only_once() {
            let p = paths();
            write(&p.legacy, json!({ "servers": { "a": { "command": "a" } } }));
            migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).unwrap();

            // A server the user deletes afterwards must not come back.
            write(&p.user, json!({ "servers": {} }));
            migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).unwrap();
            assert_eq!(read(&p.user), json!({ "servers": {} }));
        }

        #[test]
        fn does_nothing_without_a_legacy_file() {
            let p = paths();
            migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).unwrap();
            assert!(!p.user.exists());
            assert!(!p.marker.exists());
        }

        #[test]
        fn leaves_files_alone_when_the_legacy_file_is_invalid() {
            let p = paths();
            std::fs::create_dir_all(p.legacy.parent().unwrap()).unwrap();
            std::fs::write(&p.legacy, "{ not json").unwrap();
            assert!(migrate_legacy_copilot(&p.legacy, &p.user, &p.marker).is_err());
            assert!(!p.user.exists());
            assert!(!p.marker.exists(), "retry after the user fixes the file");
        }
    }
}
