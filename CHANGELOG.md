# Changelog

All notable changes to this project will be documented in this file.

## [2.4.0] - 2026-10-10

### New Features
- **Claude Code scopes** — added Local, Project and User configuration support with an explicit installation target selector
- **Project management** — added a project path selector in the header, searchable project visibility controls and per-client preferences
- **Live MCP tool inspection** — added tool inspection to server management and a dedicated Claude Code tools panel; Claude-specific tool inspection, disabled-server operations and sync remain Local-only
- **Curated discovery** — added compact catalog cards and an Add flow that opens configuration and destination selection before saving
- Added the Cohesivity MCP preset (#40)

### Improvements & Fixes
- Unified Discover and Manage navigation with Browse/Favorites and Installed/Saved Configurations views
- Fixed Claude Code installation from saved configurations and improved argument editing
- Preserved Claude Code MCP headers across the configuration lifecycle
- Improved server validation messages, remote URL display and adding key-value pairs together
- Added client icons to the header selector and improved history navigation and detail-page back behavior
- Simplified server detail links and removed redundant navigation controls
- Identified MCP Linker in Parallel Search requests

### Compatibility
- Removed Windsurf and Roo Code from the supported client list
- Documented requirements for OpenCode and Pi support

### Infrastructure & Packaging
- Migrated MCP presets to the Registry `server.json` catalog format
- Updated CI to skip Tauri bundling on pull requests
- Resolved workspace Clippy warnings
- Enabled automatically generated GitHub release notes in the release workflow

## [2.3.0] - 2026-10-07

### Security
- **Deep link & auto-submit safeguards** — removed auto-submit triggers (`autoSubmit` query parameter) in `InstallAppPage` and `ServerPage` to prevent unauthorized automated server additions; tightened host matching in `useDeepLink` to mitigate parameter injection

### Improvements & Fixes
- **Claude Code disabled servers** — updated disabled server handling to manage `disabledMcpServers` in the project configuration in place and filter disabled servers from the active list
- **Homebrew installation shorthand** — simplified brew installation instructions to `brew install mcplinker`

### Infrastructure & Packaging
- Upgraded `tauri-action` to v1 and streamlined GitHub Actions CI/release workflows
- Removed redundant custom `Info.plist` and unnecessary signing `entitlements.plist`
- Cleaned up obsolete Homebrew tap update script in favor of direct workflow automation
- Updated dependencies across the workspace (Vite 8, TypeScript 7, Tailwind CSS 4.3, Lucide React, etc.)

## [2.2.4] - 2026-09-25

### New Features
- Added an optional Parallel Search MCP preset (#37)

### Infrastructure
- macOS builds are now notarized by Apple (passes `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` to tauri-action), so the app opens without Gatekeeper warnings

## [2.2.3] - 2026-08-16

### New Features
- **Transport filter on Discover page** — filter MCP servers by Local (stdio) or Remote (HTTP/SSE) transport, with auto-pagination to keep filtered results filled
- **Global error boundary** — wrapped the app root in an `ErrorBoundary` to catch rendering errors

### Refactoring & Cleanup
- Removed cloud sync and authentication services, transitioning to a local-first architecture
- Removed unused note stores, utility modules, and components

### Infrastructure
- Added a `typecheck` CI job (`bun run typecheck`) and corresponding `typecheck` script in `package.json`
- Removed stale Supabase/auth env vars (`VITE_API_BASE_URL`, `VITE_REDIRECT_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) from CI and release workflows

## [2.1.0] - 2026-03-25

### New Features
- **Server limits for free/unauthenticated users** — enforces per-tier MCP server caps with UI feedback
- **AArch64 Windows support** — added `aarch64-pc-windows-msvc` build target to the release workflow
- **`fix-path-env` crate** — replaced custom environment path management with the `fix-path-env` crate; Tauri devtools now enabled in dev builds
- **claude-node agent** — added `claw-army/claude-node` (Python subprocess bridge for Claude Code CLI) to the agent list

### Refactoring & Cleanup
- Consolidated navigation and route state into a dedicated store, removing `react-router` / `react-router-dom` dependencies
- Simplified auth flow: inlined redirect logic in `ProtectedRoute`, added `sessionChecked` guard to prevent duplicate session checks, removed `AuthDebug` component
- Moved window-focus and deep-link handling into a dedicated module
- Adjusted global layout for full-height rendering and controlled scroll behavior
- Improved responsiveness and refactored the Claude Code page header layout
- Removed team management functionality and associated components
- Removed the `mcp-linker-api` Python backend submodule
- Removed the sleep-prevention Tauri module and its associated commands
- Removed the Codex agent entry

### Infrastructure
- Refactored CI/CD to remove the `tauri-app` subdirectory prefix; deleted Dockerfile and `.dockerignore`
- Updated dependencies and refined platform-specific conditional compilation
- Upgraded Rust edition from 2021 to 2024
- Removed Rust cache setup step from the release workflow

## [2.0.1] - 2026-03-10

## [1.7.1] - 2025-09-10

- Improved Update Experience
- Added in-app update check and automatic update functionality.
- New update dialog integrated into Settings and UpdateChecker components for a smoother user experience.
- Optimized GitHub Workflow
- Migrated to tauri-apps/tauri-action@v0 for more reliable CI/CD.
- Corrected workspace path and refined build setup for consistent cross-platform builds.
- Version & Dependency Updates
- Bumped project version to v1.7.1.
- Updated Tauri plugins, Radix UI, and other dependencies for improved performance and security.

## [1.7.0] - 2025-09-08

- add codex client - add, edit, delete local sync
- claude code - local sync, add mcp server from marketplace

## [1.6.0] - 2025-08-11

- add claude code client - add and delete mcp server
- add plux note and chat with mcp server system

## [1.5.3] - 2025-08-04

- Windows and Linux support for Cline and Roo clients
- Improved client configuration and path handling
- Enhanced cross-platform compatibility

## [1.3.2] - 2025-06-17

- Personal and Team Encrypted sync to cloud.
- Login require.

## [1.2.2] - 2025-05-04

chore: update dependencies and enhance UI components

- Upgraded @radix-ui/react-dialog from version 1.1.6 to 1.1.11 for improved functionality.
- Updated Node.js engine requirement from version 18 to 20 in package.json.
- Enhanced README with a new section inviting feedback for a Linux version.
- Refactored client selection logic in various components to improve clarity and maintainability.
- Improved UI consistency across components, including ServerCard and Sidebar.
- Added multi-language support for new UI elements and server management features.

## [1.2.1] - 2025-05-01

Fix: get server

## [1.2.0] - 2025-04-30

- Support Windows
- better ui
- Added new MIT License

## [1.1.0] - 2025-04-29

### Added
- Introduced a favorites feature for server management.
- Added recently used servers with persistent storage.
- Updated server configurations with support for both remote and local sources.

### Changed
- Enhanced UI components for better usability and structure.
- Updated styles and layout for improved user experience.

### Fixed
- Improved error handling in PowerShell commands.
- Fixed formatting of PATH environment variables in Windows setup.

### Documentation
- Added a requirements section to README.md for easier project setup instructions.

### Internal
- Removed the i18n module, refactored translation type definitions for better type safety.
- Updated dependencies:
- @rollup/rollup-win32-x64-msvc to 4.40.1
- @tauri-apps/cli to 2.5.0
- Bumped version to 1.1.0.

⸻

## [v1.0.0] - 2025-04-22

### Added
- Categories component with translation (i18n) support
- Server list component with search and dialog UI
- Reusable tabs component for consistent UI layout
- API function to fetch servers with fallback to local JSON
- Manager view for managing MCP server configurations
- Detail page for displaying selected category information
