fn main() {
    // license.rs reads this with option_env!; rebuild when it changes.
    println!("cargo:rerun-if-env-changed=MCP_LINKER_POLAR_ORG_ID");
    tauri_build::build()
}
