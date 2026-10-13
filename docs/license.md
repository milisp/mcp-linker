# License activation

Personal and Commercial are one-time purchases on Polar. They unlock the
same features; Commercial adds the commercial use license and priority support. Polar issues a license key
(the product's License Key benefit) and emails it to the buyer. MCP Linker
activates the key directly with Polar; the website and no other server are
involved.

## What a license unlocks

Free: adding, editing, enabling, disabling, and deleting servers one at a
time in every client except Claude Code and Codex, Discover, and viewing
Claude Code and Codex servers. A license unlocks:

| Feature | UI gate | Command check |
|---|---|---|
| Changing Claude Code servers (add, edit, remove, enable, disable, copy) | `claudeWrite` in `src/lib/claude.ts` | `claude_mcp_add`, `claude_mcp_remove`, `claude_mcp_copy`, `claude_disable_server`, `claude_enable_server`, `claude_update_disabled` |
| Changing Codex servers | `clientWrite` in `src/lib/claude.ts` | `license::require_for_client` in `add_mcp_server`, `update_mcp_server`, `remove_mcp_server`, `enable_mcp_server`, `disable_mcp_server`, `update_disabled_mcp_server`; `codex_set_tool_policy` |
| Sync between clients | `LocalTable` Local Sync | `sync_mcp_config` |
| Batch actions | `LocalTable` batch handlers | `batch_delete_mcp_servers` |
| Live tool inspection | `ToolsPanel` | `mcp_inspector_connect`, `claude_mcp_tools` |

The UI calls `requirePro(feature)` from `src/stores/license.ts` (directly, or
through `claudeWrite`), which opens the upgrade dialog when unlicensed.
Commands call `license::require`, which reads a flag kept in step with
`license.json`. Add both when gating a new feature. Reading Claude Code
configuration is never gated.

The source is AGPL-3.0, so these checks keep honest users honest; they are not
DRM.

## The model: activate once, then never check again

`src-tauri/src/license.rs` calls Polar's customer-portal API twice at most:

- `activate_license` posts the key, the organization id, and the label
  `MCP Linker <device id>` to `/v1/customer-portal/license-keys/activate`.
- `deactivate_license` posts to `/v1/customer-portal/license-keys/deactivate`
  to free the device's activation slot, then forgets the key locally.

Everything else answers from `license.json` in the app config directory,
next to `settings.json`:

```json
{
  "deviceId": "3f9c0a7e12b4d865",
  "key": "…",
  "activationId": "…",
  "displayKey": "****-ABCD",
  "activatedAt": "2026-10-13T12:00:00+00:00"
}
```

`licensed` is simply `activationId` being present. There is **no background
re-validation, no expiry, no offline grace period, and no trial countdown**.
Any recurring check is only a way for a paying customer to get locked out
because they were offline, Polar was down, or a response was misparsed. The
trade-off is that `license.json` can be copied to another machine; that is
accepted.

If a re-check is ever added, it must fail open (network error, timeout, or 5xx
leaves the license untouched) and revoke only on a definitive "this activation
does not exist" from Polar.

Deactivation fails closed the other way: if Polar can't be reached, the local
license is kept so the user can retry instead of losing the slot.

## Development bypass

Debug builds unlock every paid feature without a key when started with:

```sh
MCP_LINKER_LICENSE_DISABLE=1 bun tauri dev
```

It is read at runtime by `license.rs` and guarded by `cfg!(debug_assertions)`,
so release builds ignore it. A `VITE_` variable would not work: it only reaches
the frontend, while the Rust commands check the license too, and it would be
baked into whatever bundle was built with it.

## Device id

The activation label uses a random 8-byte id generated on first activation and
kept across deactivation, so a device keeps the same label in the customer
portal. It is not derived from the computer name or any hardware identifier.

## Organization id: build time, not runtime

```rust
const ORGANIZATION_ID: &str = match option_env!("MCP_LINKER_POLAR_ORG_ID") { … };
```

`option_env!` is resolved by the compiler. Exporting the variable after a
build does nothing; it must be set for the process that runs the build:

```sh
MCP_LINKER_POLAR_ORG_ID=<sandbox org id> bun tauri dev
MCP_LINKER_POLAR_ORG_ID=<production org id> bun tauri build
```

Debug builds call the Polar **sandbox** API and release builds call
production, so use the matching organization id. For local development it
can be persisted in `src-tauri/.cargo/config.toml` (git-ignored):

```toml
[env]
MCP_LINKER_POLAR_ORG_ID = "<sandbox org id>"
```

`src-tauri/build.rs` declares `cargo:rerun-if-env-changed=MCP_LINKER_POLAR_ORG_ID`
so Cargo rebuilds when it changes. A build from before that line existed may
have cached an empty id; fix it once with
`cargo clean -p mcp-linker` and rebuild.

Without the id every Activate click fails with "built without
MCP_LINKER_POLAR_ORG_ID". The release workflow refuses to run when the
`MCP_LINKER_POLAR_ORG_ID` repository secret is missing.

## Polar setup

1. Create the Personal and Commercial products as one-time purchases.
2. Add the License Key benefit to both, with an activation limit per key.
3. Add the `MCP_LINKER_POLAR_ORG_ID` secret to the GitHub repository.
