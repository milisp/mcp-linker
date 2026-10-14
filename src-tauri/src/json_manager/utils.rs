use serde_json::Value;

/// Normalize response key to mcpServers for consistent client API
pub fn normalize_response_key(mut json: Value, client: &str) -> Result<Value, String> {
    if get_key_by_client(client) == "servers" && json.is_object() {
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

/// The JSON object that holds the client's servers.
pub fn get_key_by_client(client: &str) -> &'static str {
    crate::clients::find(client).map_or("mcpServers", |c| c.servers_key)
}

/// Clients that honor a per-server `"disabled": true`; the others park disabled
/// entries under `__disabled` (see `clients::Disable`).
pub fn is_per_server_disabled_client(client: &str) -> bool {
    crate::clients::find(client).is_some_and(|c| c.disable == crate::clients::Disable::Flag)
}

/// Clients that list disabled names in a settings file (see `disabled_list`).
pub fn is_disabled_list_client(client: &str) -> bool {
    crate::clients::find(client).is_some_and(|c| c.disable == crate::clients::Disable::List)
}

