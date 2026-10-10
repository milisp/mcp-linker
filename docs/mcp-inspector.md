# Server configuration and tool inspection

`ServerWorkspace` is shared by the server page and configuration dialog. Its session-only drafts are scoped to server, client, configuration path, and Claude Code project. Switching between the dialog and page retains edits. Installed connections are loaded before saving; read failures require a retry rather than overwriting an unknown configuration.

The Tools tab connects explicitly. The inspector initializes an MCP session, reads server information and paginated `tools/list` responses, and exposes input/output schemas and server-declared annotations. It never calls tools during connection or discovery. Run tool sends the supplied JSON object to the advertised tool and displays the raw result, including `isError`.

Supported transports are stdio, Streamable HTTP (JSON or SSE responses), and legacy SSE. Supported negotiated protocol versions are 2025-11-25, 2025-06-18, 2025-03-26, and 2024-11-05. The inspector supports server ping requests; sampling, roots, and elicitation are not advertised. HTTP redirects and cross-origin legacy message endpoints are rejected. Configure explicit headers for authenticated HTTP servers; client OAuth sessions are not shared.

Inspection sessions expire after ten idle minutes, are limited to 32, and close when configuration changes or the workspace unmounts. Local commands run directly without a shell, using the app's environment plus configured variables and the selected Claude Code working directory when applicable. Requests are bounded to 4 MB and tool discovery to 5,000 tools. Connection/discovery requests time out after 30 seconds and tool calls after 60 seconds. A timed-out tool may already have changed data and is not automatically retried.

Codex tool access uses native `enabled_tools` and `disabled_tools` fields. An absent allow-list means all tools except denied ones; an empty allow-list means none. Saving policy preserves connection, authentication, timeout settings, and other servers. Connection edits preserve existing policy. Reload Codex to apply changes. This policy does not restrict manual inspection calls. Other clients expose inspection and testing but do not receive unsupported tool permission fields.

Annotations are server declarations, not scan results or safety guarantees. The UI does not assign an unverified security score.

References: [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Validation: `npm run build` and `cargo test --manifest-path src-tauri/Cargo.toml --offline --lib`. Rust tests use local fixtures for stdio pagination/ping/manual calls, HTTP session headers/SSE responses/deletion, and legacy SSE endpoints, plus policy preservation and header serialization. Browser validation uses mocked Tauri commands and does not modify installed client configuration.

Manage server names open the installed connection page; Tools actions open its Tools tab. Claude Code uses the same page. Installed routes load active and disabled entries from the selected client and configuration scope, including on reload; credentials are never embedded in routes. Disabled connection edits use the disabled-server update command and preserve tool policy. Transport labels are read-only: switching between advertised connection variants selects the full corresponding configuration rather than inventing unsupported transports. Manual Add workflows still support choosing a transport for a new custom server.

## Claude Code tool summaries

Claude Code uses the pinned `claude-agent-sdk-rs` v0.8.0 fork already used by Codexia. The Tools tab offers View tools, Refresh tools, and search over names/descriptions. It does not require schemas, change tool access, or expose manual tool execution.

The `claude_mcp_tools` command selects the saved entry from `~/.claude.json` for the current project, falling back to user scope. It preserves server OAuth metadata and header helpers, supplies only that server through a private temporary MCP configuration, and uses strict MCP loading. Claude Code handles OAuth; MCP Linker does not read its credential store. User/project/local settings are loaded, hooks are disabled for the inspection process, and session persistence is disabled. The command sends SDK initialization and `mcp_status` controls only, with a 45-second deadline and explicit disconnect. Only name, status, and tool summaries return to the frontend; configuration and credentials are omitted.

A new SDK process is not the already-running interactive Claude Code session. `needs-auth` is displayed as Claude Code's status and directs the user to `/mcp` rather than requesting Authorization headers. Local live verification against `cloudflare-api` in `~/finance` returned `needs-auth` on 2026-10-10, so authenticated discovery has not yet been verified for that account. The opt-in live test expects a connected, nonempty tool list after authentication.
