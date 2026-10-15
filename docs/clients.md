# MCP Client Configuration Paths

This document describes the supported MCP clients and their configuration file paths, categorized by platform and scope.

---

## Claude Code

- **Scope**: Project-level
- **Supported Platforms**: Cross-platform
- **Path**:
  ```
  <project_root>/.mcp.json
  ```

---

## Cline

- **Scope**: Global
- **Supported Platforms**: macOS
- **Path**:
  ```
  ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
  ```

---

## Copilot

- **Scope**: Global (VS Code user profile) or project-level
- **Supported Platforms**:
  - macOS: `~/Library/Application Support/Code/User/mcp.json`
  - Windows: `~/AppData/Roaming/Code/User/mcp.json`
  - Linux: `~/.config/Code/User/mcp.json`
- **Paths**:
  - Global: VS Code user `mcp.json` above (root key `servers`)
  - Project: `<base_path>/.vscode/mcp.json`
- **Note**: `~/.vscode/mcp.json` is no longer the global location. mcp-linker copies servers from it into the VS Code user file once (see `migrate_legacy_copilot`).

---

## GitHub Copilot CLI

- **Scope**: Global only
- **Supported Platforms**: Cross-platform
- **Path**: `$COPILOT_HOME/mcp-config.json`, else `~/.copilot/mcp-config.json` (root key `mcpServers`)
- **Note**: Does not read VS Code's `mcp.json` (checked with `copilot mcp list`). No workspace scope: `copilot mcp --help` (1.0.97) lists a workspace `.mcp.json` / `.github/mcp.json`, but in local tests (git repo, trusted folder) a workspace server did not appear, so it is not offered until that is confirmed.
- **Disable**: the native mechanism, the same as `copilot mcp disable`: the name goes into `disabledMcpServers` in `settings.json` next to `mcp-config.json`, and the entry stays in `mcp-config.json`.

---

## Cursor

- **Scope**: Global or base path
- **Supported Platforms**: Cross-platform
- **Paths**:
  - Global: `~/.cursor/mcp.json`
  - With base path: `<base_path>/.cursor/mcp.json`
- **Projects**: Recent folders come from Cursor's `User/workspaceStorage/*/workspace.json`; ones that already have `.cursor/mcp.json` are shown by default.
- **Note**: The `cursor-agent` CLI reads the same global file (checked with `cursor-agent mcp list`), so it needs no separate entry.

---

## OpenCode

- **Scope**: Global or project
- **Supported Platforms**: Cross-platform
- **Paths**:
  - Global: `~/.config/opencode/opencode.json` on every platform (`opencode.jsonc` is used instead when only that file exists)
  - Project: `<project>/opencode.json`
- **Note**: Root key `mcp`. Entries use OpenCode's own shape, `{"type":"local","command":["npx","-y","pkg"],"environment":{...}}` or `{"type":"remote","url":...,"headers":{...}}`. MCP Linker converts them to and from the common shape when reading and writing (`src-tauri/src/json_manager/entry_format.rs`), including `{env:NAME}` <-> `${NAME}`.
- **Disable**: `"enabled": false` on the entry.

---

## Pi

- **Scope**: Global or project
- **Supported Platforms**: Cross-platform
- **Paths**:
  - Global: `~/.pi/agent/mcp.json` (`$PI_CODING_AGENT_DIR/mcp.json` when set)
  - Project: `<project>/.pi/mcp.json` (Pi reads it only after project trust is granted)
- **Note**: Root key `mcpServers`, common shape. MCP is built into Pi since `@earendil-works/pi-coding-agent` 1.x. No SSE transport (Pi rejects it); `type` is dropped on write since Pi infers it from `command`/`url`.
- **Disable**: `"enabled": false` on the entry.

---

## Hermes Agent

- **Scope**: Global only
- **Supported Platforms**: Cross-platform
- **Path**: `~/.hermes/config.yaml` (`%LOCALAPPDATA%\hermes\config.yaml` on Windows, `$HERMES_HOME/config.yaml` when set)
- **Note**: YAML, root key `mcp_servers`; remote entries use `transport: sse` instead of `type`. Rewriting the file drops YAML comments, as Hermes's own `hermes mcp add` does; a commented original is kept once as `config.yaml.bak`. Non-default Hermes profiles are not picked up unless `HERMES_HOME` points at them.
- **Disable**: `"enabled": false` (YAML `enabled: false`).

---

## MCPHub

- **Scope**: Global
- **Supported Platforms**: Cross-platform
- **Path**:
  ```
  ~/.config/mcphub/servers.json
  ```

---

## Claude Desktop

- **Scope**: Global
- **Supported Platforms**:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `~/AppData/Roaming/Claude/claude_desktop_config.json`

---

## Fallback

- **Scope**: Global or custom path
- **Supported Platforms**: Cross-platform
- **Path Resolution**:
  - If a file is specified: use directly
  - If a directory is specified: append `mcp.json`
  - If empty: use `~/mcp.json`