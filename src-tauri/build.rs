use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    // license.rs reads these with option_env!; rebuild when they change.
    println!("cargo:rerun-if-env-changed=MCP_LINKER_POLAR_ORG_ID");
    println!("cargo:rerun-if-env-changed=MCP_LINKER_POLAR_PERSONAL_BENEFIT_ID");

    // A Personal key unlocks builds made within its year of updates. Release
    // builds run this script fresh; an incremental dev build may keep an older
    // time, which only makes the check more lenient.
    let build_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or(0);
    println!("cargo:rustc-env=MCP_LINKER_BUILD_TIME={build_time}");
    tauri_build::build()
}
