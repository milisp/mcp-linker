# OpenCode and Pi client support notes

This document records the configuration formats and implementation requirements for supporting OpenCode and Pi in MCP Linker. These notes do not mean either client is currently supported by the application.

## OpenCode

- **Configuration format:** JSON or JSONC. JSONC permits comments and trailing commas.
- **MCP container:** Root-level `mcp` object, keyed by server name. This differs from MCP Linker's normalized `mcpServers` API and must have a client-specific adapter.
- **Local server shape:** `type: "local"`, `command: string[]` (executable followed by arguments), optional `environment`, `cwd`, `enabled`, and `timeout`.
- **Remote server shape:** OpenCode has its own remote server schema; do not assume generic `url`/`headers` entries can be copied unchanged.
- **Global path:** `~/.config/opencode/opencode.json`; OpenCode also supports JSONC configuration. Its documented precedence includes project-root `opencode.json` and environment-provided custom paths.
- **Project configuration:** `opencode.json` in the project root. It is merged with global configuration; project settings can override global values.

### Implementation requirements

1. Preserve unknown root-level keys and all unrelated MCP entries.
2. Parse and write JSONC without silently discarding comments or trailing-comma compatibility. If comment-preserving edits are unavailable, explicitly limit support to valid JSON or reject JSONC rather than rewriting it destructively.
3. Convert the editor's command plus argument list to OpenCode's command array, and map environment variables to `environment`.
4. Map enable/disable behavior to OpenCode's `enabled` field. Do not use MCP Linker's `__disabled` container in the OpenCode file.
5. Keep project config selection explicit and keyed by the selected project path. Never silently fall back between project and global configuration.
6. Handle remote entries as a distinct supported schema or report them as unsupported; do not corrupt them during edit or sync.

## Pi

- **Configuration format:** JSON with an `mcpServers` object keyed by server name.
- **Global path:** `~/.pi/agent/mcp.json` by default. The agent directory can be customized by Pi's `PI_CODING_AGENT_DIR` environment variable.
- **Project path:** `<project>/.pi/mcp.json`.
- **Project trust:** Pi only loads project MCP configuration after that project is trusted. Adding a server to `.pi/mcp.json` does not grant trust or guarantee that Pi will load the file.
- **Server forms:** Pi supports stdio and Streamable HTTP. Use its documented schema; do not assume every MCP Linker transport/authentication option maps directly.
- **Native management:** Pi provides `pi mcp add`, `pi mcp list`, and `pi mcp remove`; `--local` selects the project config.

### Implementation requirements

1. Preserve unknown root-level fields and unrelated server entries; reject malformed JSON containers rather than replacing them with an empty object.
2. Offer Global and Project destinations as distinct targets. Project writes require an explicitly selected project directory.
3. Clearly disclose that project entries are subject to Pi's own project-trust decision. MCP Linker must not attempt to change Pi trust settings.
4. Verify disabled-server behavior against Pi's supported schema before exposing enable/disable controls. If there is no safe per-server mechanism, report that operation as unsupported instead of using MCP Linker's `__disabled` layout.
5. Respect a custom Pi agent directory where discoverable; otherwise disclose that the default global path is being used.

## Shared implementation checklist

- Use dedicated client adapters for any client whose on-disk schema differs from the common `mcpServers` representation.
- Keep client, scope, and full project/config path in target and draft identities.
- Save only after explicit user confirmation. Changing client, scope, or directory must not itself write files.
- Preserve credentials only in server configuration files. Do not place them in UI preferences, browser-persisted drafts, logs, or documentation examples.
- Test with temporary configuration fixtures: absent files, valid files with unrelated keys, duplicate server names, malformed roots/containers, disabled entries, same-basename project paths, and read/write errors.
- Test Pi Global and Project independently; test OpenCode Global and Project independently, including JSONC fixtures and preservation of unrelated settings.

## Official references

- OpenCode MCP servers: <https://docs.opencode.ai/docs/mcp-servers/>
- OpenCode configuration and precedence: <https://docs.opencode.ai/docs/config/>
- Pi MCP servers: <https://pi.dev/docs/latest/mcp>
- Pi configuration paths: <https://pi.dev/docs/latest/configuration>
- Pi project trust: <https://pi.dev/docs/latest/security>
