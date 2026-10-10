use serde_json::{json, Value};
use std::path::Path;

use super::file_io::{read_json_file, write_json_file};
use super::utils::{
    get_key_by_client, is_per_server_disabled_client,
    normalize_response_key,
};

/// Update a disabled MCP server configuration
pub async fn update_disabled_mcp_server(
    path: &Path,
    client: &str,
    name: &str,
    config: Value,
) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if is_per_server_disabled_client(client) {
        // For clients like 'cline', update the server config and set disabled: true
        if !json.is_object() {
            json = json!({});
        }
        if !json.as_object().unwrap().contains_key(key) {
            json[key] = json!({});
        }
        // Set config and disabled: true
        let mut config_with_disabled = config;
        config_with_disabled["disabled"] = json!(true);
        json[key][name] = config_with_disabled;
        write_json_file(path, &json).await?;
        return normalize_response_key(json, client);
    }

    // Default: update __disabled section
    if !json.is_object() {
        json = json!({});
    }
    // Ensure __disabled section exists
    if !json.as_object().unwrap().contains_key("__disabled") {
        json["__disabled"] = json!({});
    }

    // Update the disabled server
    json["__disabled"][name] = config;

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// Disable an MCP server
pub async fn disable_mcp_server(path: &Path, client: &str, name: &str) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if !json.is_object() {
        return Err("Invalid JSON structure".to_string());
    }

    if is_per_server_disabled_client(client) {
        // For clients like 'cline', set disabled: true on the server object
        if !json.as_object().unwrap().contains_key(key)
            || !json[key].is_object()
            || !json[key].as_object().unwrap().contains_key(name)
        {
            return Err(format!("Server '{}' not found in active servers", name));
        }
        // Set disabled: true
        json[key][name]["disabled"] = json!(true);
        write_json_file(path, &json).await?;
        return normalize_response_key(json, client);
    }

    // Default: move to __disabled section    // Check if server exists in active servers
    if !json.as_object().unwrap().contains_key(key)
        || !json[key].is_object()
        || !json[key].as_object().unwrap().contains_key(name)
    {
        return Err(format!("Server '{}' not found in active servers", name));
    }

    // Get server config
    let server_config = json[key][name].clone();

    // Remove from active servers
    json[key].as_object_mut().unwrap().remove(name);

    // Ensure __disabled section exists
    if !json.as_object().unwrap().contains_key("__disabled") {
        json["__disabled"] = json!({});
    }

    // Add to disabled section
    json["__disabled"][name] = server_config;

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// Enable an MCP server
pub async fn enable_mcp_server(path: &Path, client: &str, name: &str) -> Result<Value, String> {
    let mut json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if !json.is_object() {
        return Err("Invalid JSON structure".to_string());
    }
    if is_per_server_disabled_client(client) {
        // For clients like 'cline', remove disabled: true from the server object
        if !json.as_object().unwrap().contains_key(key)
            || !json[key].is_object()
            || !json[key].as_object().unwrap().contains_key(name)
        {
            return Err(format!("Server '{}' not found in active servers", name));
        }
        // Check if disabled: true is set
        if !json[key][name]["disabled"].as_bool().unwrap_or(false) {
            return Err(format!("Server '{}' is not disabled", name));
        }
        // Remove the disabled key
        json[key][name].as_object_mut().unwrap().remove("disabled");
        write_json_file(path, &json).await?;
        return normalize_response_key(json, client);
    }

    // Default: move from __disabled section to active
    // Check if server exists in disabled section
    if !json.as_object().unwrap().contains_key("__disabled")
        || !json["__disabled"].is_object()
        || !json["__disabled"].as_object().unwrap().contains_key(name)
    {
        return Err(format!("Server '{}' not found in disabled servers", name));
    }

    // Get server config from disabled section
    let server_config = json["__disabled"][name].clone();

    // Remove from disabled section
    json["__disabled"].as_object_mut().unwrap().remove(name);

    // Remove empty __disabled section
    if json["__disabled"].as_object().unwrap().is_empty() {
        json.as_object_mut().unwrap().remove("__disabled");
    }
    // Ensure active servers section exists
    if !json.as_object().unwrap().contains_key(key) {
        json[key] = json!({});
    }

    // Check if server already exists in active servers
    if json[key].as_object().unwrap().contains_key(name) {
        return Err(format!(
            "Server '{}' already exists in active servers",
            name
        ));
    }

    // Add to active servers
    json[key][name] = server_config;

    write_json_file(path, &json).await?;

    // Normalize response key to mcpServers for client
    normalize_response_key(json, client)
}

/// List all disabled servers
pub async fn list_disabled_servers(path: &Path, client: &str) -> Result<Value, String> {
    let json = read_json_file(path).await?;
    let key = get_key_by_client(client);

    if is_per_server_disabled_client(client) {
        // For clients like 'cline', collect all servers with disabled: true
        let mut disabled = serde_json::Map::new();
        if json.is_object()
            && json.as_object().unwrap().contains_key(key)
            && let Some(servers_obj) = json[key].as_object()
        {
            for (name, server) in servers_obj {
                if server
                    .get("disabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    disabled.insert(name.clone(), server.clone());
                }
            }
        }
        return Ok(Value::Object(disabled));
    }

    // Default: return __disabled section
    if json.is_object() && json.as_object().unwrap().contains_key("__disabled") {
        Ok(json["__disabled"].clone())
    } else {
        Ok(json!({}))
    }
}
