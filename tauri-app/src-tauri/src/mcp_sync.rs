use crate::client::ClientConfig;
use crate::json_manager::utils::{is_cherrystudio_client, is_per_server_disabled_client};
use crate::json_manager::JsonManager;
use serde_json::json;

#[tauri::command]
pub async fn sync_mcp_config(
    from_client: String,
    to_client: String,
    from_path: Option<String>,
    to_path: Option<String>,
    override_all: bool,
) -> Result<(), String> {
    let from_config = ClientConfig::new(&from_client, from_path.as_deref());
    let to_config = ClientConfig::new(&to_client, to_path.as_deref());

    let from_path = from_config.get_path();
    let to_path = to_config.get_path();

    let from_json = JsonManager::read_json_file(from_path).await?;
    let mut to_json = JsonManager::read_json_file(to_path)
        .await
        .unwrap_or_else(|_| json!({}));

    let from_servers = from_json.get("mcpServers").cloned().unwrap_or(json!({}));
    let from_disabled = from_json.get("__disabled").cloned().unwrap_or(json!({}));

    if override_all {
        to_json["mcpServers"] = from_servers;
        to_json["__disabled"] = from_disabled;
    } else {
        // Ensure mcpServers and __disabled objects exist
        if to_json["mcpServers"].is_null() {
            to_json["mcpServers"] = json!({});
        }
        if to_json["__disabled"].is_null() {
            to_json["__disabled"] = json!({});
        }

        // Handle mcpServers from from_servers
        if let Some(from_map) = from_servers.as_object() {
            for (k, v) in from_map {
                // Check if server doesn't exist in either mcpServers or __disabled
                let exists_in_servers = to_json["mcpServers"]
                    .as_object()
                    .map(|obj| obj.contains_key(k))
                    .unwrap_or(false);
                let exists_in_disabled = to_json["__disabled"]
                    .as_object()
                    .map(|obj| obj.contains_key(k))
                    .unwrap_or(false);

                if !exists_in_servers && !exists_in_disabled {
                    if let Some(to_servers) = to_json["mcpServers"].as_object_mut() {
                        to_servers.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        // Handle __disabled from from_disabled
        if let Some(from_map) = from_disabled.as_object() {
            for (k, v) in from_map {
                // Check if server doesn't exist in either mcpServers or __disabled
                let exists_in_servers = to_json["mcpServers"]
                    .as_object()
                    .map(|obj| obj.contains_key(k))
                    .unwrap_or(false);
                let exists_in_disabled = to_json["__disabled"]
                    .as_object()
                    .map(|obj| obj.contains_key(k))
                    .unwrap_or(false);

                if !exists_in_servers && !exists_in_disabled {
                    if let Some(to_disabled) = to_json["__disabled"].as_object_mut() {
                        to_disabled.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }

    // --- Special handling for cline/roo_code clients: convert between __disabled and "disabled": true ---
    // If to_client is cline/roo_code, move all __disabled servers to mcpServers with "disabled": true
    if is_per_server_disabled_client(&to_client) {
        // English comment: Move all servers from __disabled to mcpServers with "disabled": true, then clear __disabled
        if let Some(disabled_map) = to_json["__disabled"].as_object() {
            let mut to_add = vec![];
            for (k, v) in disabled_map.iter() {
                let mut server = v.clone();
                server["disabled"] = json!(true);
                to_add.push((k.clone(), server));
            }
            // Insert into mcpServers
            if let Some(servers_map) = to_json["mcpServers"].as_object_mut() {
                for (k, server) in to_add {
                    servers_map.insert(k, server);
                }
            }
        }
        // Clear __disabled
        to_json["__disabled"] = json!({});
    }
    // If to_client is cherrystudio, move all __disabled servers to mcpServers with isActive: false, then clear __disabled
    if is_cherrystudio_client(&to_client) {
        // English comment: Move all servers from __disabled to mcpServers with isActive: false, then clear __disabled
        if let Some(disabled_map) = to_json["__disabled"].as_object() {
            let mut to_add = vec![];
            for (k, v) in disabled_map.iter() {
                let mut server = v.clone();
                server["isActive"] = json!(false);
                to_add.push((k.clone(), server));
            }
            // Insert into mcpServers
            if let Some(servers_map) = to_json["mcpServers"].as_object_mut() {
                for (k, server) in to_add {
                    servers_map.insert(k, server);
                }
            }
        }
        // Clear __disabled
        to_json["__disabled"] = json!({});
    }
    // If from_client is cline/roo_code, move all mcpServers with "disabled": true to __disabled and remove from mcpServers
    if is_per_server_disabled_client(&from_client) {
        // English comment: Move all servers with "disabled": true from mcpServers to __disabled, then remove them from mcpServers
        let mut to_move = vec![];
        if let Some(servers_map) = to_json["mcpServers"].as_object() {
            for (k, v) in servers_map.iter() {
                if v.get("disabled").and_then(|d| d.as_bool()).unwrap_or(false) {
                    to_move.push((k.clone(), v.clone()));
                }
            }
        }

        // Remove from mcpServers and add to __disabled
        if let Some(servers_map) = to_json["mcpServers"].as_object_mut() {
            for (k, _) in &to_move {
                servers_map.remove(k);
            }
        }

        if let Some(disabled_map) = to_json["__disabled"].as_object_mut() {
            for (k, server) in to_move {
                let mut server_no_disabled = server;
                if server_no_disabled.is_object() {
                    server_no_disabled
                        .as_object_mut()
                        .unwrap()
                        .remove("disabled");
                }
                disabled_map.insert(k, server_no_disabled);
            }
        }
    }
    // If from_client is cherrystudio, move all mcpServers with isActive: false to __disabled and remove from mcpServers
    if is_cherrystudio_client(&from_client) {
        // English comment: Move all servers with isActive: false from mcpServers to __disabled, then remove them from mcpServers
        let mut to_move = vec![];
        if let Some(servers_map) = to_json["mcpServers"].as_object() {
            for (k, v) in servers_map.iter() {
                if v.get("isActive").and_then(|d| d.as_bool()) == Some(false) {
                    to_move.push((k.clone(), v.clone()));
                }
            }
        }

        // Remove from mcpServers and add to __disabled
        if let Some(servers_map) = to_json["mcpServers"].as_object_mut() {
            for (k, _) in &to_move {
                servers_map.remove(k);
            }
        }

        if let Some(disabled_map) = to_json["__disabled"].as_object_mut() {
            for (k, server) in to_move {
                let mut server_no_isactived = server;
                if server_no_isactived.is_object() {
                    server_no_isactived
                        .as_object_mut()
                        .unwrap()
                        .remove("isActive");
                }
                disabled_map.insert(k, server_no_isactived);
            }
        }
    }

    JsonManager::write_json_file(to_path, &to_json).await
}
