use chrono::Utc;
use serde_json::{json, Value};
use std::path::Path;

use super::file_io::{read_json_file, write_json_file};
use super::utils::{get_key_by_client, normalize_response_key};

/// Add a new MCP server
pub async fn add_mcp_server(
    path: &Path,
    client: &str,
    name: &str,
    config: Value,
) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if !json.is_object() {
        json = json!({});
    }

    if !json.as_object().unwrap().contains_key(key) {
        json[key] = json!({});
    }

    if json[key].as_object().unwrap().contains_key(name) {
        return Err(format!("Server '{}' already exists in '{}'", name, key));
    }

    let mut config = config.clone();
    config["_creator"] = json!("mcp_linker");
    config["updated_at"] = json!(Utc::now().to_rfc3339());

    json[key][name] = config;

    write_json_file(path, &json).await?;
    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// Remove an MCP server
pub async fn remove_mcp_server(path: &Path, client: &str, name: &str) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if json.is_object()
        && json.as_object().unwrap().contains_key(key)
        && json[key].is_object()
        && json[key].as_object().unwrap().contains_key(name)
    {
        json[key].as_object_mut().unwrap().remove(name);
    }

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// Update an existing MCP server
pub async fn update_mcp_server(
    path: &Path,
    client: &str,
    name: &str,
    config: Value,
) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if !json.is_object() {
        json = json!({});
    }

    // Check if server exists in active servers
    if json.as_object().unwrap().contains_key(key)
        && json[key].is_object()
        && json[key].as_object().unwrap().contains_key(name)
    {
        let mut config = config.clone();
        config["_creator"] = json!("mcp_linker");
        config["updated_at"] = json!(Utc::now().to_rfc3339());
        json[key][name] = config;
    }
    // Check if server exists in disabled servers
    else if json.as_object().unwrap().contains_key("__disabled")
        && json["__disabled"].is_object()
        && json["__disabled"].as_object().unwrap().contains_key(name)
    {
        let mut config = config.clone();
        config["_creator"] = json!("mcp_linker");
        config["updated_at"] = json!(Utc::now().to_rfc3339());
        json["__disabled"][name] = config;
    }
    // If server doesn't exist in either section, add to active servers
    else {
        if !json.as_object().unwrap().contains_key(key) {
            json[key] = json!({});
        }
        let mut config = config.clone();
        config["_creator"] = json!("mcp_linker");
        config["updated_at"] = json!(Utc::now().to_rfc3339());
        json[key][name] = config;
    }

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// Batch delete multiple MCP servers
pub async fn batch_delete_mcp_servers(
    path: &Path,
    client: &str,
    server_names: Vec<String>,
) -> Result<Value, String> {
    use super::utils::is_per_server_disabled_client;

    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if !json.is_object() {
        return Err("Invalid JSON structure".to_string());
    }

    if is_per_server_disabled_client(client) {
        // For clients like 'cline', just remove the servers from mcpServers
        if json.as_object().unwrap().contains_key(key)
            && let Some(servers_obj) = json[key].as_object_mut()
        {
            for server_name in &server_names {
                servers_obj.remove(server_name);
            }
        }
        write_json_file(path, &json).await?;
        return normalize_response_key(json, client);
    }

    // Default: move from __disabled to active, then delete from active
    // First, enable all disabled servers that are in the list
    let mut servers_to_enable = Vec::new();
    if json.as_object().unwrap().contains_key("__disabled")
        && let Some(disabled_obj) = json["__disabled"].as_object()
    {
        for server_name in &server_names {
            if disabled_obj.contains_key(server_name) {
                servers_to_enable.push(server_name.clone());
            }
        }
    }
    // Enable disabled servers by moving them to active section
    for server_name in servers_to_enable {
        if let Some(server_config) = json["__disabled"]
            .as_object_mut()
            .and_then(|disabled| disabled.remove(&server_name))
        {
            // Ensure active servers section exists
            if !json.as_object().unwrap().contains_key(key) {
                json[key] = json!({});
            }

            // Add to active servers
            json[key][&server_name] = server_config;
        }
    }

    // Clean up empty __disabled section
    if let Some(disabled_obj) = json["__disabled"].as_object()
        && disabled_obj.is_empty()
    {
        json.as_object_mut().unwrap().remove("__disabled");
    }

    // Now delete all servers from active section
    if json.as_object().unwrap().contains_key(key)
        && let Some(servers_obj) = json[key].as_object_mut()
    {
        for server_name in &server_names {
            servers_obj.remove(server_name);
        }
    }

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}
