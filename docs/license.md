# License activation

Plus and Pro are one-time purchases on Polar. Each includes a year of
updates; the version you have keeps working forever. Plus unlocks every client
except Claude Code and Codex; Pro adds those two and priority support. Both may
be used at work. Polar issues a license key (the product's License Key
benefit) and emails it to the buyer. MCP Linker activates the key directly with
Polar; the website and no other server are involved.

## What each tier unlocks

Each client has a `tier` in `src-tauri/src/clients.rs` (`Tier` is in
`license.rs`; `free < plus < pro`). Viewing every client's servers and
Discover are always free.

| Tier | Clients you can change | Features |
|---|---|---|
| Free | Claude Desktop, Cursor (and mcp-linker's own store) | Sync between those two |
| Plus | Copilot, Copilot CLI, Cline, OpenCode, Pi, Hermes, Augment, mcphub, Custom | Batch actions, live tool inspection |
| Pro | Claude Code (every scope), Codex | Copying Claude Code servers between projects, Claude Code tool inspection, Codex tool policy |

| Gate | UI | Command check |
|---|---|---|
| Changing a client's servers | `requireClient(id)` via `clientWrite` / `claudeWrite` in `src/lib/claude.ts` | `license::require_client` in every write command: `add/update/remove_mcp_server`, `enable/disable/update_disabled_mcp_server`, `write_json_file`, `claude_mcp_add/remove`, `claude_enable/disable_server`, `claude_update_disabled`, `codex_set_tool_policy` |
| Copying Claude Code servers between projects (Pro) | `claudeWrite` (`claudeCopy`) | `claude_mcp_copy` |
| Batch actions (Plus) | `LocalTable` batch handlers | `batch_delete_mcp_servers` (plus the client's tier) |
| Live tool inspection (Plus; Pro for Claude Code) | `ToolsPanel` | `mcp_inspector_connect`, `claude_mcp_tools` |

Sync between clients has no gate of its own: each write it makes goes through
`clientWrite` / `claudeWrite`, so syncing into a client above your tier opens
the upgrade dialog.

The UI calls `requirePro(feature, tier?)` or `requireClient(id)` from
`src/stores/license.ts`, which open the upgrade dialog naming the tier
needed. Commands call `license::require(tier, feature)` or
`license::require_client`, which read the license kept in memory in step with
`license.json`. Add both when gating a new feature or changing a client's
tier. Reading configuration is never gated.

The source is AGPL-3.0, so these checks keep honest users honest; they are not
DRM.

## Tier and update window

At activation, `license.rs` reads the key's `benefit_id` and `created_at` from
Polar's response:

- The Plus benefit gives `tier: plus`, the Pro benefit `tier: pro`. Both store
  `updatesUntil` = purchase + 365 days.
- Any other benefit (keys issued to pre-license buyers) is Pro with no
  `updatesUntil`, meaning lifetime updates.
- A `license.json` saved before tiers has no `tier`: it was a Personal key
  (now Plus) if it has `updatesUntil`, else Pro.

`build.rs` bakes the build time into the binary (`MCP_LINKER_BUILD_TIME`). A
license counts only when the build time is on or before `updatesUntil`, so an
older build keeps its paid features forever, and a newer one runs as the free
version with a renew prompt in Settings → License. The update dialog warns
before installing a version released after `updatesUntil`. An unparseable date
fails open.

Renewing is buying the same plan again (at a returning-customer discount) and
activating the new key, which carries a new purchase date.

The benefit ids default to the production ones. Debug builds talk to the Polar
sandbox, so set its ids to test tiers and the window:

```sh
MCP_LINKER_POLAR_PLUS_BENEFIT_ID=<sandbox id> MCP_LINKER_POLAR_PRO_BENEFIT_ID=<sandbox id> bun tauri dev
```

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
  "activatedAt": "2026-10-13T12:00:00+00:00",
  "updatesUntil": "2027-10-13T12:00:00+00:00"
}
```

`licensed` is `activationId` being present and the build falling inside
`updatesUntil` (see Update window). There is **no background
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

1. Create the Plus and Pro products as one-time purchases.
2. Give each its own License Key benefit, with an activation limit per key and
   no expiry. The app enforces the year of updates itself; a Polar expiry
   would stop the key from activating on a new device at all. The two benefit
   ids are `PLUS_BENEFIT_ID` and `PRO_BENEFIT_ID` in `license.rs`.
3. Keys for pre-license buyers come from a separate benefit, never the Plus or
   Pro one, so they get Pro with lifetime updates.
4. Add the `MCP_LINKER_POLAR_ORG_ID` secret to the GitHub repository.
