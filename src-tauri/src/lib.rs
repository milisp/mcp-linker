// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use std::env;
use std::sync::{Arc, Mutex};

mod adapter;
mod claude_code_commands;
mod claude_disabled;
mod client;
mod cmd;
mod codex;
mod config;
mod encryption;
mod git;
mod installer;
mod json_manager;
mod mcp_commands;
mod mcp_crud;
mod mcp_sync;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            window::show_window(app, argv);
        }));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
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
            git::git_clone,
            encryption::generate_encryption_key,
            encryption::encrypt_data,
            encryption::decrypt_data,
            claude_code_commands::claude_mcp_list,
            claude_code_commands::claude_mcp_get,
            claude_code_commands::claude_mcp_add,
            claude_code_commands::claude_mcp_remove,
            claude_code_commands::claude_list_projects,
            claude_code_commands::check_claude_cli_available,
            claude_code_commands::check_claude_config_exists,
            claude_disabled::claude_list_disabled,
            claude_disabled::claude_disable_server,
            claude_disabled::claude_enable_server,
            claude_disabled::claude_update_disabled,
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
