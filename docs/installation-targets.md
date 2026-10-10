# Installation targets and visible projects

This document records installation behavior, persistence and implementation limitations. It does not prescribe UI placement, spacing or alignment.

## Installation behavior

- Catalog **Add** opens the configuration dialog; it never writes immediately. The dialog and server detail page provide independent destination selection using the shared target selector.
- Choose the client first. Only clients supported by the existing directory-based backend expose a project/config-directory selector (Claude Code, Cursor, Roo Code, Copilot, Custom and the legacy VS Code target).
- Claude Desktop, Cline, Windsurf, Codex and MCPHub use their existing user configuration routes. Do not infer project support just because a client accepts a path elsewhere.
- Installation targets include client, supported scope and project/config directory. Projects with the same name must remain distinguishable by full path.
- **Browse** adds a directory and selects it. Cancelling preserves the previous target.

## Server collections and entry points

- Discover provides Browse and Favorites views. Favorites contains bookmarked catalog servers, not installed server configurations.
- Manage provides Installed and Saved Configurations views. Installed uses the selected installation target; Saved Configurations reads MCP Linker's saved configuration collection, not the selected client's installed list.
- Saved Configurations replaces the misleading Recently Added label. The current collection has no addition timestamps or chronological sorting and must not be described as recent catalog additions.
- Manage retains its existing custom-server configuration dialog. Favorites, saved configurations and custom-server creation are not separate sidebar navigation entries.
- Legacy `/favorites` and `/recently` routes remain supported and show their respective views within Discover and Manage. Import Configuration opens `/install-app` and is distinct from Manage's custom-server dialog. The same page handles incoming installation deep links; opening a link must not automatically submit the configuration.
- Known limitation: Saved Configurations retains legacy browser-storage migration and direct add/delete commands. Migration can write configurations when the view loads; these commands do not implement Claude Code scope-aware routing. This legacy flow is not covered by the explicit-save and scope guarantees of the shared editor and must not be treated as scope-safe.

## Claude Code scopes

| Scope | Destination | Intended use |
| --- | --- | --- |
| Local | `~/.claude.json`, `projects[absolute project path].mcpServers` | Private configuration for one project |
| Project | `<project>/.mcp.json`, `mcpServers` | Team-shared project configuration |
| User | `~/.claude.json`, top-level `mcpServers` | Personal configuration across projects |

Local and Project require a project directory; User does not. The labels describe scope, not transport: a remote HTTP server can have any scope. Project configuration may contain credentials, so avoid committing literal secrets to version control.

The application lists the selected scope, not a merged effective view. Commands default to Local when `scope` is omitted for backwards compatibility. Scope-aware add/get/list/remove preserve unrelated JSON fields and other server names, and reject malformed containers.

Current limitations: Claude Code disabled-server operations, sync and Claude-specific tool inspection remain Local-only. Non-local operations must report this explicitly; never inspect or mutate a same-named Local server as a fallback. A saved Project server may still require Claude Code's own approval before use.

Official scope reference: `https://code.claude.com/docs/en/mcp` (MCP installation scopes).

## Visible-project preferences

**Manage projects** offers search and checkboxes. Claude Code supplies discovered project paths; other directory-based targets are added using Browse. Discovery does not automatically select the first project or expose the entire list in the main selector.

Preferences are client-specific. Unchecking a project only hides a shortcut; it does not delete files, remove MCP entries or change Claude Code's project registry. The current project remains selectable until the user explicitly switches, even if unchecked.

The app writes `settings.json` in Tauri's application configuration directory for the app identifier `dev.milisp.mcplinker`. It does not create a competing `~/.mcp-linker/settings.json` file. Example:

```json
{
  "projectPreferences": {
    "claude_code": { "visibleProjects": ["/work/api", "/work/web"] },
    "cursor": { "visibleProjects": ["/work/web"] }
  }
}
```

Unknown top-level settings are preserved. Load/save errors are shown in the selector; failed loads are not overwritten by an empty preference set. Writes are queued and use a temporary file before rename. Current client/path and Claude scope/project are remembered by the existing Zustand/browser storage; server credentials are not placed in this settings file.

## Implementation map

- `src/components/settings/InstallationTarget.tsx`: shared target selection and project management.
- `src/pages/Discover.tsx` and `src/pages/favorites.tsx`: catalog browsing and favorites.
- `src/pages/manage.tsx` and `src/pages/recently.tsx`: installed and saved configuration views; the latter retains the legacy limitations described above.
- `src/routes.tsx`: page routing, legacy collection routes and primary navigation entries.
- `src/stores/projectPreferences.ts`: settings hydration and queued preference writes.
- `src-tauri/src/app_settings.rs`: application-directory settings persistence.
- `src/stores/ccProject.ts`: selected Claude scope/project.
- `src/components/server/hooks/useServerEditor.ts`: target-keyed session drafts; unsaved inputs carry to a new target without copying installed identity.
- `src/components/server/hooks/useSaveServerConfig.ts`: explicit save routing.
- `src-tauri/src/claude_code_commands.rs`: scoped Claude configuration I/O.

## Verification checklist

1. From a catalog card, click Add, change client and directory, inspect Save location, then save. No file should change before the final confirmation.
2. In details, type arguments/headers, change to an unused target, and verify unsaved inputs survive. Existing destination configuration must be reviewed, not silently replaced.
3. Add the same test server name with different URLs in all three Claude scopes. List/edit/delete each independently; unrelated scopes and JSON fields must remain intact.
4. Select User without a project. Saving and listing should work; Local/Project without a directory should fail clearly.
5. Uncheck projects, restart, and verify visible lists per client. Hidden/current projects must not trigger automatic target switching.
6. Cancel Browse and verify no change. Test same-basename directories and long paths.
7. Test invalid `settings.json`, read/write failures and unsupported non-local disabled/sync/tool operations; no silent fallback is permitted.
8. Run `bunx tsc --noEmit`, `cargo check --offline` and the Claude scope unit tests from `src-tauri`.
