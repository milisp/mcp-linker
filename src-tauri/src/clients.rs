//! The one list of supported clients. The frontend gets it through `list_clients`;
//! Rust code looks entries up with `find` instead of matching on client ids.

use serde::Serialize;

/// How the client's servers are read and written.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Storage {
    Json,
    /// `~/.codex/config.toml`
    CodexToml,
    /// Through the `claude` CLI and `~/.claude.json`.
    ClaudeCode,
}

/// Where the config lives and what the user has to choose.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Location {
    /// A fixed per-user file.
    User,
    /// The per-user file, or `project_file` inside a chosen project folder.
    UserOrProject,
    /// A config file the user picks; there is no default.
    File,
    /// Claude Code's own project and scope selection.
    ClaudeCode,
}

/// How a server is turned off without deleting it.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Disable {
    /// `"disabled": true` on the entry, which the client honors.
    Flag,
    /// The client has no flag, so the entry is parked under `__disabled` in the
    /// same file, a key the client ignores.
    Stash,
    /// Names listed in the client's `settings.json` next to its config
    /// (Copilot CLI's `disabledMcpServers`); entries stay in the config file.
    List,
    /// The client's own mechanism (Codex `enabled = false`, Claude Code's store).
    Native,
}

/// How a server entry is written in the client's file. Anything but `Common` is
/// converted to and from the common shape at the file boundary (`json_manager::entry_format`).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Entry {
    /// `command`/`args`/`env` or `type`/`url`/`headers`, off with `"disabled": true`.
    Common,
    /// The common shape, off with `"enabled": false` (Pi).
    Enabled,
    /// `{type: "local", command: [..], environment}` or `{type: "remote", url, headers}`, `"enabled": false`.
    OpenCode,
    /// The common shape in YAML, `transport: sse` instead of `type`, `"enabled": false`.
    Hermes,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClientInfo {
    pub id: &'static str,
    pub label: &'static str,
    pub url: &'static str,
    pub storage: Storage,
    /// The JSON object that holds the servers.
    pub servers_key: &'static str,
    pub location: Location,
    /// Relative to a project folder, for `Location::UserOrProject`.
    pub project_file: Option<&'static str>,
    pub disable: Disable,
    #[serde(skip)]
    pub entry: Entry,
    /// Writing this client's config needs no license (`license::require_client`).
    pub free: bool,
    /// mcp-linker's own store; not offered as a target.
    #[serde(skip)]
    pub internal: bool,
}

const fn json(id: &'static str, label: &'static str, url: &'static str) -> ClientInfo {
    ClientInfo {
        id,
        label,
        url,
        storage: Storage::Json,
        servers_key: "mcpServers",
        location: Location::User,
        project_file: None,
        disable: Disable::Stash,
        entry: Entry::Common,
        free: false,
        internal: false,
    }
}

pub const CLIENTS: &[ClientInfo] = &[
    ClientInfo {
        storage: Storage::ClaudeCode,
        location: Location::ClaudeCode,
        disable: Disable::Native,
        ..json("claude_code", "Claude Code", "https://code.claude.com/docs/en/mcp")
    },
    ClientInfo {
        storage: Storage::CodexToml,
        disable: Disable::Native,
        ..json("codex", "Codex", "https://github.com/openai/codex")
    },
    ClientInfo { free: true, ..json("claude", "Claude Desktop", "https://claude.ai/download") },
    ClientInfo {
        location: Location::UserOrProject,
        project_file: Some(".cursor/mcp.json"),
        free: true,
        ..json("cursor", "Cursor", "https://cursor.com/")
    },
    ClientInfo {
        disable: Disable::Flag,
        ..json("cline", "Cline (In VSCode)", "https://github.com/cline/cline")
    },
    ClientInfo {
        servers_key: "servers",
        location: Location::UserOrProject,
        project_file: Some(".vscode/mcp.json"),
        ..json("copilot", "GitHub Copilot (VS Code)", "https://code.visualstudio.com/docs/copilot/customization/mcp-servers")
    },
    ClientInfo {
        disable: Disable::List,
        ..json("copilot_cli", "GitHub Copilot CLI", "https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli")
    },
    ClientInfo {
        servers_key: "mcp",
        location: Location::UserOrProject,
        project_file: Some("opencode.json"),
        disable: Disable::Flag,
        entry: Entry::OpenCode,
        ..json("opencode", "OpenCode", "https://opencode.ai/docs/mcp-servers/")
    },
    ClientInfo {
        location: Location::UserOrProject,
        project_file: Some(".pi/mcp.json"),
        disable: Disable::Flag,
        entry: Entry::Enabled,
        ..json("pi", "Pi", "https://pi.dev/")
    },
    ClientInfo {
        servers_key: "mcp_servers",
        disable: Disable::Flag,
        entry: Entry::Hermes,
        ..json("hermes", "Hermes Agent", "https://github.com/NousResearch/hermes-agent")
    },
    ClientInfo {
        location: Location::UserOrProject,
        project_file: Some(".augment/settings.json"),
        ..json("augment", "Augment (Auggie CLI)", "https://docs.augmentcode.com/cli/integrations")
    },
    ClientInfo {
        disable: Disable::Flag,
        ..json("mcphub", "mcphub.nvim", "https://github.com/ravitemer/mcphub.nvim")
    },
    ClientInfo {
        location: Location::File,
        ..json("custom", "Custom", "")
    },
    ClientInfo {
        internal: true,
        free: true,
        ..json("mcplinker", "MCP Linker", "")
    },
];

pub fn find(id: &str) -> Option<&'static ClientInfo> {
    CLIENTS.iter().find(|client| client.id == id)
}

/// Clients the user can pick, in display order.
#[tauri::command]
pub fn list_clients() -> Vec<ClientInfo> {
    CLIENTS.iter().filter(|client| !client.internal).cloned().collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn ids_are_unique() {
        let ids: HashSet<_> = CLIENTS.iter().map(|c| c.id).collect();
        assert_eq!(ids.len(), CLIENTS.len());
    }

    #[test]
    fn project_clients_name_their_project_file() {
        for client in CLIENTS {
            assert_eq!(
                client.project_file.is_some(),
                client.location == Location::UserOrProject,
                "{}",
                client.id
            );
        }
    }

    #[test]
    fn converted_entries_disable_with_the_common_flag() {
        // entry_format maps their `enabled: false` to `disabled: true`.
        for client in CLIENTS.iter().filter(|c| c.entry != Entry::Common) {
            assert_eq!(client.disable, Disable::Flag, "{}", client.id);
        }
    }

    #[test]
    fn only_json_clients_use_in_file_disable() {
        for client in CLIENTS {
            assert_eq!(client.disable == Disable::Native, client.storage != Storage::Json, "{}", client.id);
        }
    }

    #[test]
    fn only_claude_desktop_and_cursor_are_free_targets() {
        let free: Vec<_> = list_clients().into_iter().filter(|c| c.free).map(|c| c.id).collect();
        assert_eq!(free, ["claude", "cursor"]);
    }

    #[test]
    fn list_hides_internal_clients_and_serializes_camel_case() {
        let list = serde_json::to_value(list_clients()).unwrap();
        assert!(list.as_array().unwrap().iter().all(|c| c["id"] != "mcplinker"));
        let copilot = list.as_array().unwrap().iter().find(|c| c["id"] == "copilot").unwrap();
        assert_eq!(copilot["serversKey"], "servers");
        assert_eq!(copilot["location"], "userOrProject");
        assert_eq!(copilot["projectFile"], ".vscode/mcp.json");
        assert_eq!(copilot["disable"], "stash");
        assert!(copilot.get("internal").is_none());
    }
}
