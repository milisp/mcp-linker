//! License activation with Polar. See docs/license.md.
//!
//! The key is checked with Polar once, at activation, and the result is kept
//! in `license.json` in the app config directory. There is no background
//! re-validation, expiry, or grace period: a one-time purchase must never lock
//! a customer out because they are offline or Polar is unavailable.

use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

#[cfg(debug_assertions)]
const POLAR_API: &str = "https://sandbox-api.polar.sh/v1";
#[cfg(not(debug_assertions))]
const POLAR_API: &str = "https://api.polar.sh/v1";

/// Polar organization id, resolved at compile time:
///   MCP_LINKER_POLAR_ORG_ID=<id> bun tauri build
/// Debug builds talk to the Polar sandbox, so use the sandbox organization id.
const ORGANIZATION_ID: &str = match option_env!("MCP_LINKER_POLAR_ORG_ID") {
    Some(id) => id,
    None => "",
};

/// Mirrors `activation_id.is_some()` so feature checks need no managed state.
static LICENSED: AtomicBool = AtomicBool::new(false);

/// Debug builds only: `MCP_LINKER_LICENSE_DISABLE=1 bun tauri dev` unlocks every
/// feature without a key. Release builds compile this to `false`.
fn dev_bypass() -> bool {
    cfg!(debug_assertions)
        && std::env::var("MCP_LINKER_LICENSE_DISABLE").is_ok_and(|v| v == "1" || v == "true")
}

fn is_licensed(license: &License) -> bool {
    license.activation_id.is_some() || dev_bypass()
}

/// Errors unless this device holds an activated license. Paid features call
/// this in their commands; the UI checks first and offers an upgrade.
pub fn require(feature: &str) -> Result<(), String> {
    if LICENSED.load(Ordering::Relaxed) {
        Ok(())
    } else {
        Err(format!("{feature} requires an MCP Linker Personal or Pro license."))
    }
}

/// Changing Claude Code or Codex configuration is a paid feature; every other
/// client stays free. Reading configuration is never gated.
pub fn require_for_client(client: &str) -> Result<(), String> {
    match client {
        "claude_code" => require("Managing Claude Code servers"),
        "codex" => require("Managing Codex servers"),
        _ => Ok(()),
    }
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct License {
    /// Random per-install id, sent to Polar as the activation label so a
    /// customer can tell their devices apart without sharing the computer name.
    pub device_id: Option<String>,
    pub key: Option<String>,
    pub activation_id: Option<String>,
    pub display_key: Option<String>,
    pub activated_at: Option<String>,
}

pub struct LicenseStore(pub Mutex<License>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub licensed: bool,
    pub display_key: Option<String>,
    pub device_id: Option<String>,
}

#[derive(Deserialize)]
struct Activation {
    id: String,
    license_key: ActivatedKey,
}

#[derive(Deserialize)]
struct ActivatedKey {
    display_key: Option<String>,
    status: Option<String>,
}

fn license_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("license.json"))
}

pub fn load(app: &AppHandle) -> License {
    let license: License = license_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default();
    LICENSED.store(is_licensed(&license), Ordering::Relaxed);
    license
}

fn persist(app: &AppHandle, license: &License) -> Result<(), String> {
    LICENSED.store(is_licensed(license), Ordering::Relaxed);
    let path = license_path(app)?;
    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_vec_pretty(license).map_err(|e| e.to_string())?;
    fs::write(&temporary, json).map_err(|e| e.to_string())?;
    fs::rename(temporary, path).map_err(|e| e.to_string())
}

fn status_of(license: &License) -> LicenseStatus {
    LicenseStatus {
        licensed: is_licensed(license),
        display_key: if license.activation_id.is_none() && dev_bypass() {
            Some("Development bypass (MCP_LINKER_LICENSE_DISABLE)".into())
        } else {
            license.display_key.clone()
        },
        device_id: license.device_id.clone(),
    }
}

fn new_device_id() -> Result<String, String> {
    let mut bytes = [0u8; 8];
    SystemRandom::new()
        .fill(&mut bytes)
        .map_err(|_| "Could not generate a device id.".to_string())?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

fn ensure_configured() -> Result<(), String> {
    if ORGANIZATION_ID.is_empty() {
        return Err(
            "This build of MCP Linker cannot activate licenses (built without MCP_LINKER_POLAR_ORG_ID)."
                .into(),
        );
    }
    Ok(())
}

async fn post(path: &str, body: serde_json::Value) -> Result<reqwest::Response, String> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    client
        .post(format!("{POLAR_API}{path}"))
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|_| "Could not reach Polar. Check your connection and try again.".to_string())
}

#[tauri::command]
pub fn license_status(store: State<'_, LicenseStore>) -> LicenseStatus {
    status_of(&store.0.lock().unwrap())
}

#[tauri::command]
pub async fn activate_license(
    app: AppHandle,
    store: State<'_, LicenseStore>,
    key: String,
) -> Result<LicenseStatus, String> {
    ensure_configured()?;
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("Enter a license key.".into());
    }

    let device_id = {
        let mut license = store.0.lock().unwrap();
        if license.device_id.is_none() {
            license.device_id = Some(new_device_id()?);
            persist(&app, &license)?;
        }
        license.device_id.clone().unwrap_or_default()
    };

    let res = post(
        "/customer-portal/license-keys/activate",
        serde_json::json!({
            "key": key,
            "organization_id": ORGANIZATION_ID,
            "label": format!("MCP Linker {device_id}"),
        }),
    )
    .await?;

    match res.status().as_u16() {
        200..=299 => {}
        404 | 422 => return Err("That license key was not recognized.".into()),
        403 => {
            return Err(
                "This key cannot be activated: it may be disabled or already active on its maximum number of devices. Deactivate an old device or contact support."
                    .into(),
            )
        }
        _ => return Err("Activation failed. Please try again later.".into()),
    }

    let text = res.text().await.map_err(|e| e.to_string())?;
    let activation: Activation =
        serde_json::from_str(&text).map_err(|_| "Unexpected response from Polar.".to_string())?;
    if let Some(status) = activation
        .license_key
        .status
        .as_deref()
        .filter(|status| *status != "granted")
    {
        return Err(format!("This license key is {status}."));
    }

    let mut license = store.0.lock().unwrap();
    license.key = Some(key);
    license.activation_id = Some(activation.id);
    license.display_key = activation.license_key.display_key;
    license.activated_at = Some(chrono::Utc::now().to_rfc3339());
    persist(&app, &license)?;
    Ok(status_of(&license))
}

/// Frees this device's activation slot on Polar, then forgets the key.
/// A network failure keeps the local license so the user can retry.
#[tauri::command]
pub async fn deactivate_license(
    app: AppHandle,
    store: State<'_, LicenseStore>,
) -> Result<LicenseStatus, String> {
    let (key, activation_id) = {
        let license = store.0.lock().unwrap();
        (license.key.clone(), license.activation_id.clone())
    };

    if let (Some(key), Some(activation_id), false) =
        (key, activation_id, ORGANIZATION_ID.is_empty())
    {
        let res = post(
            "/customer-portal/license-keys/deactivate",
            serde_json::json!({
                "key": key,
                "organization_id": ORGANIZATION_ID,
                "activation_id": activation_id,
            }),
        )
        .await?;
        // 404: the activation is already gone on Polar's side.
        if !res.status().is_success() && res.status().as_u16() != 404 {
            return Err("Deactivation failed. Please try again later.".into());
        }
    }

    let mut license = store.0.lock().unwrap();
    license.key = None;
    license.activation_id = None;
    license.display_key = None;
    license.activated_at = None;
    persist(&app, &license)?;
    Ok(status_of(&license))
}
