use serde_json::Value;

/// Normalize response key to mcpServers for consistent client API
pub fn normalize_response_key(mut json: Value, client: &str) -> Result<Value, String> {
    if client == "copilot" && json.is_object() {
        let servers_key = "servers";
        let mcp_servers_key = "mcpServers";

        // If json has "servers" key but not "mcpServers"
        if json.as_object().unwrap().contains_key(servers_key)
            && !json.as_object().unwrap().contains_key(mcp_servers_key)
        {
            // Clone the content from servers to mcpServers
            let servers_value = json[servers_key].clone();
            json[mcp_servers_key] = servers_value;
        }
    }

    Ok(json)
}

/// Get the appropriate key name based on client type
pub fn get_key_by_client(client: &str) -> &str {
    if client == "copilot" {
        "servers"
    } else {
        "mcpServers"
    }
}

/// Clients that read a per-server `"disabled": true`. Clients without a native
/// flag (Claude Desktop, Cursor, VS Code) cannot be told to skip a server, so a
/// disabled server is parked under `__disabled` in the same file instead: it
/// stays with the config, and those clients ignore the unknown key.
pub fn is_per_server_disabled_client(client: &str) -> bool {
    matches!(client, "cline" | "mcphub")
}

