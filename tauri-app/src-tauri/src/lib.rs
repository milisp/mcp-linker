// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use std::env;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use sleep::{allow_sleep, prevent_sleep, SleepState};

mod adapter;
mod codex_commands;
mod claude_code_commands;
mod claude_disabled;
mod client;
mod cmd;
mod codex;
mod config;
mod dxt;
mod encryption;
mod env_path;
mod filesystem;
mod git;
mod installer;
mod json_manager;
mod mcp_commands;
mod mcp_crud;
mod mcp_sync;
mod sleep;
mod state;

use codex_commands::CodexState;
use state::WatchState;
use filesystem::{
    directory_ops::{canonicalize_path, get_default_directories, read_directory, search_files},
    file_analysis::calculate_file_tokens,
    file_io::{read_file, write_file},
    file_parsers::{csv::read_csv_content, pdf::read_pdf_content, xlsx::read_xlsx_content},
    git_diff::get_git_file_diff,
    git_status::get_git_status,
    git_worktree::{
        prepare_git_worktree,
        git_commit_changes,
        apply_reverse_patch,
        commit_changes_to_worktree,
        delete_git_worktree,
    },
    watch::{start_watch_directory, stop_watch_directory},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_path::update_env_path();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            show_window(app, argv);
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
            dxt::load_manifests,
            dxt::load_manifest,
            dxt::fetch_and_save_manifest,
            dxt::read_dxt_setting,
            dxt::save_dxt_setting,
            dxt::download_and_extract_manifests,
            dxt::check_manifests_exist,
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
            read_directory,
            get_default_directories,
            search_files,
            canonicalize_path,
            calculate_file_tokens,
            read_file,
            write_file,
            read_pdf_content,
            read_csv_content,
            read_xlsx_content,
            get_git_file_diff,
            get_git_status,
            prepare_git_worktree,
            git_commit_changes,
            apply_reverse_patch,
            delete_git_worktree,
            commit_changes_to_worktree,
            start_watch_directory,
            stop_watch_directory,
            codex_commands::check::check_codex_version,
            codex_commands::read_codex_config,
            codex_commands::get_project_name,
            codex_commands::is_version_controlled,
            codex_commands::set_project_trust,
            codex_commands::read_model_providers,
            codex_commands::read_profiles,
            codex_commands::get_provider_config,
            codex_commands::get_profile_config,
            codex_commands::add_or_update_profile,
            codex_commands::delete_profile,
            codex_commands::add_or_update_model_provider,
            codex_commands::delete_model_provider,
            codex_commands::send_user_message,
            codex_commands::turn_start,
            codex_commands::new_conversation,
            codex_commands::resume_conversation,
            codex_commands::interrupt_conversation,
            codex_commands::respond_exec_command_request,
            codex_commands::respond_apply_patch_request,
            codex_commands::get_account,
            codex_commands::login_account_chatgpt,
            codex_commands::login_account_api_key,
            codex_commands::cancel_login_account,
            codex_commands::logout_account,
            codex_commands::add_conversation_listener,
            codex_commands::remove_conversation_listener,
            codex_commands::get_account_rate_limits,
            codex_commands::initialize_client,
            codex_commands::scan_projects,
            codex_commands::load_project_sessions,
            codex_commands::update_cache_title,
            codex_commands::update_project_favorites,
            codex_commands::remove_project_session,
            codex_commands::read_token_usage,
            prevent_sleep,
            allow_sleep,
        ])
        .manage(Arc::new(Mutex::new(None::<String>)))
        .manage(CodexState::new())
        .manage(SleepState::default())
        .manage(WatchState::new())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            let codex_state = app.state::<CodexState>();
            codex_commands::setup_event_bridge(
                app.handle().clone(),
                codex_state.client_state.clone(),
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_window(app: &AppHandle, args: Vec<String>) {
    let windows = app.webview_windows();
    let main_window = windows.values().next().expect("Sorry, no window found");

    main_window
        .set_focus()
        .expect("Can't Bring Window to Focus");

    dbg!(args.clone());
    if args.len() > 1 {
        let url = args[1].clone();

        dbg!(url.clone());
        if url.starts_with("mcp-linker://") {
            let _ = main_window.emit("deep-link-received", url);
        }
    }
}
