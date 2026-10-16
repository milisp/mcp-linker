//! License activation with Polar. See docs/license.md.
//!
//! The key is checked with Polar once, at activation, and the result is kept
//! in `license.json` in the app config directory. There is no background
//! re-validation, expiry, or grace period: a one-time purchase must never lock
//! a customer out because they are offline or Polar is unavailable. Plus and
//! Pro keys cover builds released within a year of purchase; older builds keep
//! working with them forever. Pro adds the Pro-only clients (Claude Code, Codex).

use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Manager};

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

/// The Plus and Pro benefits; both include a year of updates. Any other key,
/// such as the ones issued to pre-license buyers, is Pro with lifetime
/// updates. Debug builds talk to the Polar sandbox, whose benefits have other
/// ids: `MCP_LINKER_POLAR_PLUS_BENEFIT_ID=<id> MCP_LINKER_POLAR_PRO_BENEFIT_ID=<id> bun tauri dev`.
const PLUS_BENEFIT_ID: &str = match option_env!("MCP_LINKER_POLAR_PLUS_BENEFIT_ID") {
    Some(id) => id,
    None => "28a294aa-b224-4b6e-9e09-9dc077213ae0",
};
const PRO_BENEFIT_ID: &str = match option_env!("MCP_LINKER_POLAR_PRO_BENEFIT_ID") {
    Some(id) => id,
    None => "fe8d3992-90f8-46a0-9ee8-4b9f32b697d0",
};
const UPDATE_DAYS: i64 = 365;

/// What a license unlocks; each tier includes the ones before it.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Tier {
    Free,
    Plus,
    Pro,
}

/// Unix time this binary was built, set by build.rs. A Plus or Pro key unlocks
/// builds made on or before its `updates_until`.
const BUILD_TIME: i64 = match option_env!("MCP_LINKER_BUILD_TIME") {
    Some(time) => parse_i64(time),
    None => 0,
};

const fn parse_i64(text: &str) -> i64 {
    let bytes = text.as_bytes();
    let mut value = 0i64;
    let mut i = 0;
    while i < bytes.len() {
        value = value * 10 + (bytes[i] - b'0') as i64;
        i += 1;
    }
    value
}

/// The license, shared with the feature checks that commands call.
static LICENSE: Mutex<License> = Mutex::new(License::empty());
static LICENSE_PATH: OnceLock<PathBuf> = OnceLock::new();

fn lock() -> MutexGuard<'static, License> {
    LICENSE.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Debug builds only: `MCP_LINKER_LICENSE_DISABLE=1 bun tauri dev` unlocks every
/// feature without a key. Release builds compile this to `false`.
fn dev_bypass() -> bool {
    cfg!(debug_assertions)
        && std::env::var("MCP_LINKER_LICENSE_DISABLE").is_ok_and(|v| v == "1" || v == "true")
}

/// An unparseable date fails open: a parsing bug must not lock a customer out.
fn covers_this_build(updates_until: Option<&str>) -> bool {
    updates_until
        .and_then(|date| chrono::DateTime::parse_from_rfc3339(date).ok())
        .is_none_or(|date| BUILD_TIME <= date.timestamp())
}

/// The tier this device has for this build. Licenses saved before tiers
/// existed have no `tier`; back then only Personal (now Plus) keys had an
/// update window, so a window means Plus and none means Pro.
fn tier_of(license: &License) -> Tier {
    if dev_bypass() {
        Tier::Pro
    } else if license.activation_id.is_none() || !covers_this_build(license.updates_until.as_deref()) {
        Tier::Free
    } else {
        license.tier.unwrap_or(if license.updates_until.is_some() { Tier::Plus } else { Tier::Pro })
    }
}

/// Errors unless this device holds at least `tier` for this build. Paid
/// features call this in their commands; the UI checks first and offers an
/// upgrade.
pub fn require(tier: Tier, feature: &str) -> Result<(), String> {
    if tier_of(&lock()) >= tier {
        return Ok(());
    }
    let plan = if tier == Tier::Pro { "an MCP Linker Pro" } else { "an MCP Linker Plus or Pro" };
    Err(format!("{feature} requires {plan} license."))
}

/// Writing a client's config needs the client's tier from `clients.rs`.
/// Reading is free for every client.
pub fn require_client(id: &str) -> Result<(), String> {
    match crate::clients::find(id) {
        Some(client) => require(client.tier, &format!("Changing {} servers", client.label)),
        None => require(Tier::Pro, &format!("Changing '{id}' servers")),
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
    /// RFC 3339. Builds made after this need a renewed key; `None` means
    /// lifetime updates.
    #[serde(default)]
    pub updates_until: Option<String>,
    #[serde(default)]
    pub tier: Option<Tier>,
}

impl License {
    const fn empty() -> Self {
        License {
            device_id: None,
            key: None,
            activation_id: None,
            display_key: None,
            activated_at: None,
            updates_until: None,
            tier: None,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub licensed: bool,
    /// `free` when unlicensed or when this build is past the key's updates.
    pub tier: Tier,
    pub display_key: Option<String>,
    pub device_id: Option<String>,
    pub updates_until: Option<String>,
    /// Activated, but this build was released after the key's updates ended.
    pub updates_expired: bool,
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
    benefit_id: Option<String>,
    created_at: Option<String>,
}

fn tier_for(key: &ActivatedKey) -> Tier {
    if key.benefit_id.as_deref() == Some(PLUS_BENEFIT_ID) { Tier::Plus } else { Tier::Pro }
}

/// A year after purchase for Plus and Pro keys, `None` (lifetime) for the rest.
fn updates_until(key: &ActivatedKey) -> Option<String> {
    if !matches!(key.benefit_id.as_deref(), Some(id) if id == PLUS_BENEFIT_ID || id == PRO_BENEFIT_ID) {
        return None;
    }
    let purchased = key
        .created_at
        .as_deref()
        .and_then(|date| chrono::DateTime::parse_from_rfc3339(date).ok())
        .map_or_else(chrono::Utc::now, |date| date.with_timezone(&chrono::Utc));
    Some((purchased + chrono::Duration::days(UPDATE_DAYS)).to_rfc3339())
}

fn license_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("license.json"))
}

/// Reads `license.json` once at startup.
pub fn init(app: &AppHandle) {
    let Ok(path) = license_path(app) else { return };
    let license: License = fs::read_to_string(&path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default();
    let _ = LICENSE_PATH.set(path);
    *lock() = license;
}

fn persist(license: &License) -> Result<(), String> {
    let path = LICENSE_PATH
        .get()
        .ok_or("The license file location is unknown.")?;
    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_vec_pretty(license).map_err(|e| e.to_string())?;
    fs::write(&temporary, json).map_err(|e| e.to_string())?;
    fs::rename(temporary, path).map_err(|e| e.to_string())
}

fn status_of(license: &License) -> LicenseStatus {
    let tier = tier_of(license);
    LicenseStatus {
        licensed: tier != Tier::Free,
        tier,
        display_key: if license.activation_id.is_none() && dev_bypass() {
            Some("Development bypass (MCP_LINKER_LICENSE_DISABLE)".into())
        } else {
            license.display_key.clone()
        },
        device_id: license.device_id.clone(),
        updates_until: license.updates_until.clone(),
        updates_expired: license.activation_id.is_some()
            && !covers_this_build(license.updates_until.as_deref()),
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
pub fn license_status() -> LicenseStatus {
    status_of(&lock())
}

#[tauri::command]
pub async fn activate_license(key: String) -> Result<LicenseStatus, String> {
    ensure_configured()?;
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("Enter a license key.".into());
    }

    let device_id = {
        let mut license = lock();
        if license.device_id.is_none() {
            license.device_id = Some(new_device_id()?);
            persist(&license)?;
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

    let mut license = lock();
    license.key = Some(key);
    license.activation_id = Some(activation.id);
    license.updates_until = updates_until(&activation.license_key);
    license.tier = Some(tier_for(&activation.license_key));
    license.display_key = activation.license_key.display_key;
    license.activated_at = Some(chrono::Utc::now().to_rfc3339());
    persist(&license)?;
    Ok(status_of(&license))
}

/// Frees this device's activation slot on Polar, then forgets the key.
/// A network failure keeps the local license so the user can retry.
#[tauri::command]
pub async fn deactivate_license() -> Result<LicenseStatus, String> {
    let (key, activation_id) = {
        let license = lock();
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

    let mut license = lock();
    license.key = None;
    license.activation_id = None;
    license.display_key = None;
    license.activated_at = None;
    license.updates_until = None;
    license.tier = None;
    persist(&license)?;
    Ok(status_of(&license))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(benefit_id: &str, created_at: &str) -> ActivatedKey {
        ActivatedKey {
            display_key: None,
            status: None,
            benefit_id: Some(benefit_id.into()),
            created_at: Some(created_at.into()),
        }
    }

    #[test]
    fn plus_keys_get_a_year_from_purchase() {
        let key = key(PLUS_BENEFIT_ID, "2026-10-13T22:08:05.157102Z");
        assert_eq!(tier_for(&key), Tier::Plus);
        let until = updates_until(&key).unwrap();
        assert!(until.starts_with("2027-10-13T22:08:05"), "{until}");
    }

    #[test]
    fn pro_keys_get_a_year_from_purchase() {
        let key = key(PRO_BENEFIT_ID, "2026-10-16T09:00:00Z");
        assert_eq!(tier_for(&key), Tier::Pro);
        assert!(updates_until(&key).unwrap().starts_with("2027-10-16T09:00:00"));
    }

    #[test]
    fn other_keys_are_pro_with_lifetime_updates() {
        let key = key("legacy-benefit", "2026-10-13T00:00:00Z");
        assert_eq!(tier_for(&key), Tier::Pro);
        assert_eq!(updates_until(&key), None);
    }

    #[test]
    fn licenses_saved_without_a_tier_get_it_from_their_update_window() {
        let activated = |updates_until: Option<&str>| License {
            activation_id: Some("a".into()),
            updates_until: updates_until.map(Into::into),
            ..License::empty()
        };
        assert_eq!(tier_of(&License::empty()), Tier::Free);
        assert_eq!(tier_of(&activated(Some("2999-01-01T00:00:00Z"))), Tier::Plus);
        assert_eq!(tier_of(&activated(None)), Tier::Pro);
        assert_eq!(tier_of(&activated(Some("2000-01-01T00:00:00Z"))), Tier::Free);
    }

    #[test]
    fn update_window_is_checked_against_the_build_time() {
        assert!(covers_this_build(None));
        assert!(covers_this_build(Some("not a date")));
        assert!(covers_this_build(Some("2999-01-01T00:00:00Z")));
        assert!(!covers_this_build(Some("2000-01-01T00:00:00Z")));
    }
}
