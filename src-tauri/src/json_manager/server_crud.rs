use chrono::Utc;
use serde_json::{Value, json};
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

    // A disabled server lives under "__disabled", so look there too.
    for section in [key, "__disabled"] {
        if let Some(servers) = json.get_mut(section).and_then(Value::as_object_mut) {
            servers.remove(name);
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    async fn write_fixture(path: &Path, value: Value) {
        write_json_file(path, &value).await.unwrap();
    }

    #[tokio::test]
    async fn update_inserts_missing_server_and_keeps_others() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        write_fixture(&path, json!({"mcpServers":{"existing":{"command":"keep"}}})).await;

        update_mcp_server(
            &path,
            "claude",
            "new",
            json!({"command":"npx","args":["x"]}),
        )
        .await
        .unwrap();

        let saved = read_json_file(&path).await.unwrap();
        assert_eq!(saved["mcpServers"]["new"]["command"], "npx");
        assert_eq!(saved["mcpServers"]["new"]["args"], json!(["x"]));
        assert_eq!(saved["mcpServers"]["new"]["_creator"], "mcp_linker");
        assert!(saved["mcpServers"]["new"]["updated_at"].is_string());
        assert_eq!(saved["mcpServers"]["existing"], json!({"command":"keep"}));
    }

    #[tokio::test]
    async fn update_overwrites_active_server_and_drops_stale_fields() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        write_fixture(
            &path,
            json!({"mcpServers":{"demo":{"command":"old","env":{"A":"1"}},"other":{"command":"o"}}}),
        )
        .await;

        update_mcp_server(&path, "claude", "demo", json!({"command":"new"}))
            .await
            .unwrap();

        let saved = read_json_file(&path).await.unwrap();
        assert_eq!(saved["mcpServers"]["demo"]["command"], "new");
        assert!(saved["mcpServers"]["demo"].get("env").is_none());
        assert_eq!(saved["mcpServers"]["demo"]["_creator"], "mcp_linker");
        assert_eq!(saved["mcpServers"]["other"], json!({"command":"o"}));
    }

    #[tokio::test]
    async fn update_disabled_server_stays_disabled() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        write_fixture(
            &path,
            json!({"mcpServers":{"a":{"command":"a"}},"__disabled":{"off":{"command":"old"}}}),
        )
        .await;

        update_mcp_server(&path, "claude", "off", json!({"command":"new"}))
            .await
            .unwrap();

        let saved = read_json_file(&path).await.unwrap();
        assert_eq!(saved["__disabled"]["off"]["command"], "new");
        assert_eq!(saved["__disabled"]["off"]["_creator"], "mcp_linker");
        assert!(saved["mcpServers"].get("off").is_none());
        assert_eq!(saved["mcpServers"]["a"], json!({"command":"a"}));
    }

    #[tokio::test]
    async fn remove_deletes_only_named_server() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        write_fixture(
            &path,
            json!({"mcpServers":{"a":{"command":"a"},"b":{"command":"b"}}}),
        )
        .await;

        remove_mcp_server(&path, "claude", "a").await.unwrap();

        let saved = read_json_file(&path).await.unwrap();
        assert!(saved["mcpServers"].get("a").is_none());
        assert_eq!(saved["mcpServers"]["b"], json!({"command":"b"}));
    }

    #[tokio::test]
    async fn remove_deletes_disabled_server() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        write_json_file(
            &path,
            &json!({
                "mcpServers": { "active": { "command": "a" } },
                "__disabled": { "off": { "command": "b" } }
            }),
        )
        .await
        .unwrap();

        remove_mcp_server(&path, "claude", "off").await.unwrap();

        let json = read_json_file(&path).await.unwrap();
        assert!(json["__disabled"].get("off").is_none());
        assert_eq!(json["mcpServers"]["active"]["command"], "a");
    }

    #[tokio::test]
    async fn remove_missing_server_is_not_an_error_and_keeps_file() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        let original = json!({"theme":"dark","mcpServers":{"a":{"command":"a"}}});
        write_fixture(&path, original.clone()).await;

        remove_mcp_server(&path, "claude", "ghost").await.unwrap();

        assert_eq!(read_json_file(&path).await.unwrap(), original);
    }

    #[tokio::test]
    async fn copilot_client_uses_servers_key() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("mcp.json");
        write_fixture(&path, json!({"servers":{"a":{"command":"a"}}})).await;

        update_mcp_server(&path, "copilot", "b", json!({"command":"b"}))
            .await
            .unwrap();

        let saved = read_json_file(&path).await.unwrap();
        assert_eq!(saved["servers"]["b"]["command"], "b");
        assert_eq!(saved["servers"]["a"], json!({"command":"a"}));
        assert!(saved.get("mcpServers").is_none());

        remove_mcp_server(&path, "copilot", "a").await.unwrap();
        let saved = read_json_file(&path).await.unwrap();
        assert!(saved["servers"].get("a").is_none());
        assert!(saved["servers"].get("b").is_some());
    }

    #[tokio::test]
    async fn update_on_missing_file_creates_it() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("nested").join("config.json");
        assert!(!path.exists());

        update_mcp_server(&path, "claude", "demo", json!({"command":"x"}))
            .await
            .unwrap();

        assert!(path.exists());
        let saved = read_json_file(&path).await.unwrap();
        assert_eq!(saved["mcpServers"]["demo"]["command"], "x");
    }
}
