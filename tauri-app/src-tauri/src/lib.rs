// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::sync::{Arc, Mutex};

mod client;
mod cmd;
mod encryption;
mod env_path;
mod git;
mod installer;
mod json_manager;
mod mcp_commands;
mod mcp_crud;
mod mcp_sync;

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    #[serde(rename = "mcpServers", alias = "servers")]
    mcp_servers: Value,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_path::update_env_path();

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            cmd::read_json_file,
            cmd::write_json_file,
            cmd::get_app_path,
            cmd::check_mcplinker_config_exists,
            mcp_crud::add_mcp_server,
            mcp_crud::remove_mcp_server,
            mcp_crud::update_mcp_server,
            mcp_crud::batch_delete_mcp_servers,
            mcp_commands::disable_mcp_server,
            mcp_commands::enable_mcp_server,
            mcp_commands::list_disabled_servers,
            mcp_commands::update_disabled_mcp_server,
            mcp_sync::sync_mcp_config,
            installer::check_command_exists,
            installer::install_command,
            env_path::get_path_env,
            git::git_clone,
            encryption::generate_encryption_key,
            encryption::encrypt_data,
            encryption::decrypt_data,
        ])
        .manage(Arc::new(Mutex::new(None::<String>)))
        .setup(|_app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
