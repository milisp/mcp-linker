use crate::adapter::ClientAdapter;
use serde_json::Value;

pub(crate) fn normalize_codex_config(mut server_config: Value) -> Result<Value, String> {
    println!("[Codex] normalize input: {}", server_config);
    // Ensure a "type" discriminator exists for serde(tag="type") enum
    if !server_config.get("type").and_then(|v| v.as_str()).is_some() {
        if server_config.get("command").is_some() {
            // stdio style
            if let Some(obj) = server_config.as_object_mut() {
                obj.insert("type".into(), Value::from("stdio"));
            }
        } else if server_config.get("url").is_some() {
            // http style; treat both http and sse as http in codex config
            if let Some(obj) = server_config.as_object_mut() {
                obj.insert("type".into(), Value::from("http"));
            }
        } else {
            return Err("missing field `type`".into());
        }
    } else if let Some(t) = server_config.get("type").and_then(|v| v.as_str()) {
        // Map unsupported variants
        if t == "sse" {
            if let Some(obj) = server_config.as_object_mut() {
                obj.insert("type".into(), Value::from("http"));
            }
        }
    }

    // Coerce env values to strings if present under stdio
    if let Some(env) = server_config.get_mut("env") {
        if let Some(map) = env.as_object_mut() {
            let keys: Vec<String> = map.keys().cloned().collect();
            for k in keys {
                if let Some(v) = map.get(&k) {
                    let s = if v.is_string() {
                        v.as_str().unwrap().to_string()
                    } else {
                        v.to_string()
                    };
                    map.insert(k, Value::from(s));
                }
            }
        }
    }

    // Normalize disabled/isActive flags into enabled boolean
    if let Some(disabled_flag) = server_config
        .get("disabled")
        .and_then(|v| v.as_bool())
    {
        if let Some(obj) = server_config.as_object_mut() {
            if disabled_flag {
                obj.insert("enabled".into(), Value::from(false));
            } else {
                obj.remove("enabled");
            }
            obj.remove("disabled");
        }
    }
    if let Some(is_active_flag) = server_config
        .get("isActive")
        .and_then(|v| v.as_bool())
    {
        if let Some(obj) = server_config.as_object_mut() {
            if !is_active_flag {
                obj.insert("enabled".into(), Value::from(false));
            } else {
                obj.remove("enabled");
            }
            obj.remove("isActive");
        }
    }

    println!("[Codex] normalize output: {}", server_config);
    Ok(server_config)
}

#[tauri::command]
pub async fn add_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
    server_config: Value,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.add(server_name, server_config).await
}

#[tauri::command]
pub async fn remove_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.remove(server_name).await
}

#[tauri::command]
pub async fn update_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
    server_config: Value,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.update(server_name, server_config).await
}

#[tauri::command]
pub async fn batch_delete_mcp_servers(
    client_name: String,
    path: Option<String>,
    server_names: Vec<String>,
) -> Result<Value, String> {
    let adapter = ClientAdapter::new(&client_name, path.as_deref());
    adapter.batch_delete(server_names).await
}
