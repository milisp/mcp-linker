use crate::client::ClientConfig;
use crate::codex as codex_cmds;
use crate::json_manager::JsonManager;
use serde_json::Value;

pub enum ClientAdapter<'a> {
    Json {
        client: &'a str,
        path: Option<&'a str>,
    },
    Codex,
}

impl<'a> ClientAdapter<'a> {
    pub fn new(client: &'a str, path: Option<&'a str>) -> Self {
        if crate::clients::find(client).is_some_and(|c| c.storage == crate::clients::Storage::CodexToml) {
            ClientAdapter::Codex
        } else {
            ClientAdapter::Json { client, path }
        }
    }

    fn json_path(&self) -> Result<(String, std::path::PathBuf), String> {
        match self {
            ClientAdapter::Json { client, path } => {
                let cfg = ClientConfig::new(client, *path)?;
                Ok((client.to_string(), cfg.get_path().to_path_buf()))
            }
            ClientAdapter::Codex => Err("Codex has no JSON config".into()),
        }
    }

    pub async fn add(&self, name: String, cfg: Value) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] add server: {}", name);
                let normalized = crate::mcp_crud::normalize_codex_config(cfg)?;
                let parsed: crate::codex::McpServerConfig = serde_json::from_value(normalized)
                    .map_err(|e| format!("Invalid server config for codex: {}", e))?;
                codex_cmds::add_mcp_server(name, parsed).await?;
                let servers = codex_cmds::read_mcp_servers().await?;
                Ok(serde_json::json!({"mcpServers": servers}))
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] add server: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::add_mcp_server(&path, client_name.as_str(), &name, cfg).await
            }
        }
    }

    pub async fn remove(&self, name: String) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] remove server: {}", name);
                codex_cmds::delete_mcp_server(name).await?;
                let servers = codex_cmds::read_mcp_servers().await?;
                Ok(serde_json::json!({"mcpServers": servers}))
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] remove server: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::remove_mcp_server(&path, client_name.as_str(), &name).await
            }
        }
    }

    pub async fn update(&self, name: String, cfg: Value) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] update server: {}", name);
                let normalized = crate::mcp_crud::normalize_codex_config(cfg)?;
                let parsed: crate::codex::McpServerConfig = serde_json::from_value(normalized)
                    .map_err(|e| format!("Invalid server config for codex: {}", e))?;
                codex_cmds::add_mcp_server(name, parsed).await?;
                let servers = codex_cmds::read_mcp_servers().await?;
                Ok(serde_json::json!({"mcpServers": servers}))
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] update server: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::update_mcp_server(&path, client_name.as_str(), &name, cfg).await
            }
        }
    }

    pub async fn batch_delete(&self, names: Vec<String>) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] batch delete servers");
                for n in names {
                    let _ = codex_cmds::delete_mcp_server(n).await;
                }
                let servers = codex_cmds::read_mcp_servers().await?;
                Ok(serde_json::json!({"mcpServers": servers}))
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] batch delete -> {}",
                    client_name,
                    path.display()
                );
                JsonManager::batch_delete_mcp_servers(&path, client_name.as_str(), names).await
            }
        }
    }

    pub async fn list_disabled(&self) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                let disabled = codex_cmds::list_disabled().await?;
                println!("[Adapter][Codex] list disabled: {}", disabled.len());
                Ok(serde_json::to_value(disabled).unwrap_or_default())
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] list disabled -> {}",
                    client_name,
                    path.display()
                );
                JsonManager::list_disabled_servers(&path, client_name.as_str()).await
            }
        }
    }

    pub async fn disable(&self, name: String) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] disable: {}", name);
                codex_cmds::disable(&name).await?;
                let disabled = codex_cmds::list_disabled().await?;
                Ok(serde_json::to_value(disabled).unwrap_or_default())
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] disable: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::disable_mcp_server(&path, client_name.as_str(), &name).await
            }
        }
    }

    pub async fn enable(&self, name: String) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] enable: {}", name);
                codex_cmds::enable(&name).await?;
                let disabled = codex_cmds::list_disabled().await?;
                Ok(serde_json::to_value(disabled).unwrap_or_default())
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] enable: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::enable_mcp_server(&path, client_name.as_str(), &name).await
            }
        }
    }

    pub async fn update_disabled(&self, name: String, cfg: Value) -> Result<Value, String> {
        match self {
            ClientAdapter::Codex => {
                println!("[Adapter][Codex] update disabled: {}", name);
                let parsed: crate::codex::McpServerConfig = serde_json::from_value(cfg)
                    .map_err(|e| format!("Invalid server config for codex: {}", e))?;
                codex_cmds::update_disabled(&name, parsed).await?;
                let disabled = codex_cmds::list_disabled().await?;
                Ok(serde_json::to_value(disabled).unwrap_or_default())
            }
            ClientAdapter::Json { .. } => {
                let (client_name, path) = self.json_path()?;
                println!(
                    "[Adapter][JSON:{}] update disabled: {} -> {}",
                    client_name,
                    name,
                    path.display()
                );
                JsonManager::update_disabled_mcp_server(&path, client_name.as_str(), &name, cfg)
                    .await
            }
        }
    }
}
