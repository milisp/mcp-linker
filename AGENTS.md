# Agent guide

## Project

MCP Linker is a Tauri v2 desktop application with React, TypeScript and Vite. Use Bun, shadcn UI/Tailwind, Zustand and TanStack Query. Frontend code is in `src/`; Rust commands and configuration adapters are in `src-tauri/src/`.

Read nearby code before changing behavior. Preserve pre-existing working-tree changes. Prefer small direct edits and reuse existing components. Do not add a second router, settings store or target selector without a clear migration.

## MCP installation safety

- Read `docs/installation-targets.md` before modifying add, save, project selection or Claude Code scopes.
- Installation target is client + scope (when supported) + project/config directory. Transport (`stdio`, HTTP, SSE) is a separate concept.
- Reuse `InstallationTarget` in detail and dialog flows. Sidebar selection must never be the only way to choose a destination when adding.
- Adding or overwriting a server requires an explicit user action. No automatic writes from deep links, discovery, timers or dropdown changes.
- Never silently select a different project. Cancelling a picker preserves the current target. Hiding a shortcut is not deletion.
- Use actual backend capabilities, not assumed parity across clients. Claude Local, Project and User must use their distinct configuration containers.
- Do not apply Local disabled state, sync or tool inspection to another Claude scope. Explicit unsupported messaging is preferable to modifying the wrong server.
- Include scope in draft/cache/target identities. Preserve unsaved inputs when switching targets, but never transfer persisted identity or disabled state to the new destination.
- Preserve unrelated JSON fields and server entries. Reject invalid configuration instead of replacing it with an empty object.
- Credentials belong in server configurations, not UI preference files, browser-persisted drafts, logs or documentation examples.

## UI and settings

- Follow existing functional components/hooks. Prefer shadcn Badge/Button/Select/Dialog over bespoke substitutes.
- Do not rely on hover alone for important paths or destination information. Provide an explicit path disclosure and accessible labels.
- Project visibility is stored per client in application-config `settings.json`; preserve unknown top-level keys and surface persistence errors.
- New projects must not flood the visible selector automatically. Offer searchable management and deliberate selection.
- Current selection has legacy browser-storage persistence. Do not claim it is persisted in the settings file without implementing a migration.

## Validation

- Frontend changes: run `bunx tsc --noEmit`.
- Rust changes: run `cargo check --offline` in `src-tauri` when dependencies are available; run focused tests for modified scope/config helpers.
- Run `git diff --check`. Do not run broad formatters that rewrite unrelated dirty files.
- Test Local/Project/User independently, including duplicate names, missing paths and malformed containers. Use temporary fixtures rather than real user client configs.
- Report what was validated and what remains unsupported. Do not claim visual or end-to-end validation based only on type checking.
