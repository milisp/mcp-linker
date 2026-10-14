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