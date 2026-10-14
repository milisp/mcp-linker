use serde_json::Value;
use std::path::Path;

// Module declarations
pub mod disabled_list;
pub mod file_io;
pub mod server_crud;
pub mod server_state;
pub mod utils;

// Re-exports for convenience

/// Main JsonManager struct that provides a unified interface for all JSON operations
pub struct JsonManager;

impl JsonManager {
    // File I/O operations
    pub async fn read_json_file(path: &Path) -> Result<Value, String> {
        file_io::read_json_file(path).await
    }

    pub async fn write_json_file(path: &Path, content: &Value) -> Result<(), String> {
        file_io::write_json_file(path, content).await
    }

    // Server CRUD operations
    pub async fn add_mcp_server(
        path: &Path,
        client: &str,
        name: &str,
        config: Value,
    ) -> Result<Value, String> {
        server_crud::add_mcp_server(path, client, name, config).await
    }

    pub async fn remove_mcp_server(path: &Path, client: &str, name: &str) -> Result<Value, String> {
        server_crud::remove_mcp_server(path, client, name).await
    }

    pub async fn update_mcp_server(
        path: &Path,
        client: &str,
        name: &str,
        config: Value,
    ) -> Result<Value, String> {
        server_crud::update_mcp_server(path, client, name, config).await
    }

    pub async fn batch_delete_mcp_servers(
        path: &Path,
        client: &str,
        server_names: Vec<String>,
    ) -> Result<Value, String> {
        server_crud::batch_delete_mcp_servers(path, client, server_names).await
    }

    // Server state management operations
    pub async fn disable_mcp_server(
        path: &Path,
        client: &str,
        name: &str,
    ) -> Result<Value, String> {
        server_state::disable_mcp_server(path, client, name).await
    }

    pub async fn enable_mcp_server(path: &Path, client: &str, name: &str) -> Result<Value, String> {
        server_state::enable_mcp_server(path, client, name).await
    }

    pub async fn update_disabled_mcp_server(
        path: &Path,
        client: &str,
        name: &str,
        config: Value,
    ) -> Result<Value, String> {
        server_state::update_disabled_mcp_server(path, client, name, config).await
    }

    pub async fn list_disabled_servers(path: &Path, client: &str) -> Result<Value, String> {
        server_state::list_disabled_servers(path, client).await
    }
}
