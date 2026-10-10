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

/// Returns true if the client uses per-server 'disabled' key instead of global __disabled section
pub fn is_per_server_disabled_client(client: &str) -> bool {
    client == "cline"
}

