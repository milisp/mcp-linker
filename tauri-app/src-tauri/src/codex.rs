use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use toml_edit::{value, DocumentMut, InlineTable, Item, Table, Value};

use crate::config::{get_config_path, CodexConfig};

fn default_enabled() -> bool {
    true
}

fn is_enabled_true(enabled: &bool) -> bool {
    *enabled
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum McpServerConfig {
    #[serde(rename = "stdio")]
    Stdio {
        command: String,
        args: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        env: Option<HashMap<String, String>>,
        #[serde(default = "default_enabled", skip_serializing_if = "is_enabled_true")]
        enabled: bool,
    },
    #[serde(rename = "http")]
    Http {
        url: String,
        #[serde(default = "default_enabled", skip_serializing_if = "is_enabled_true")]
        enabled: bool,
    },
}

impl McpServerConfig {
    fn is_enabled(&self) -> bool {
        match self {
            McpServerConfig::Stdio { enabled, .. } => *enabled,
            McpServerConfig::Http { enabled, .. } => *enabled,
        }
    }
}

static CODEX_CFG_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

pub async fn read_mcp_servers() -> Result<HashMap<String, McpServerConfig>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        println!("[Codex] config not found: {}", config_path.display());
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .await
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;
    let (active_count, disabled_count) = partition_config_states(&config.mcp_servers);
    println!(
        "[Codex] read servers: active={}, disabled={}",
        active_count,
        disabled_count + config.disabled_mcp_servers.len()
    );

    Ok(config
        .mcp_servers
        .into_iter()
        .filter(|(_, cfg)| cfg.is_enabled())
        .collect())
}

async fn load_config() -> Result<CodexConfig, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        println!(
            "[Codex] load default config (no file): {}",
            config_path.display()
        );
        return Ok(CodexConfig::default());
    }
    let content = fs::read_to_string(&config_path)
        .await
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;
    let (active_count, disabled_count) = partition_config_states(&config.mcp_servers);
    println!(
        "[Codex] load config: active={}, disabled={}",
        active_count,
        disabled_count + config.disabled_mcp_servers.len()
    );
    Ok(config)
}

async fn load_document(config_path: &Path) -> Result<DocumentMut, String> {
    let mut doc = if config_path.exists() {
        let existing = fs::read_to_string(config_path)
            .await
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        existing
            .parse::<DocumentMut>()
            .map_err(|e| format!("Failed to parse config TOML: {}", e))?
    } else {
        DocumentMut::new()
    };
    migrate_disabled_table(&mut doc)?;
    Ok(doc)
}

async fn persist_document(config_path: &Path, doc: DocumentMut) -> Result<(), String> {
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let tmp_path = config_path.with_extension("toml.tmp");
    let (active_count, disabled_count) = doc_counts(&doc);
    let toml_content = doc.to_string();
    println!(
        "[Codex] save config: path={}, tmp={}, active={}, disabled={}",
        config_path.display(),
        tmp_path.display(),
        active_count,
        disabled_count
    );
    let mut file = fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(toml_content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    file.flush()
        .await
        .map_err(|e| format!("Failed to flush temp file: {}", e))?;
    drop(file);
    fs::rename(&tmp_path, config_path)
        .await
        .map_err(|e| format!("Failed to rename temp file: {}", e))?;
    Ok(())
}

fn ensure_table<'a>(doc: &'a mut DocumentMut, key: &str) -> Result<&'a mut Table, String> {
    if doc.get(key).is_none() {
        doc[key] = Item::Table(Table::new());
    }
    doc[key]
        .as_table_mut()
        .ok_or_else(|| format!("{} is not a table", key))
}

fn remove_entry(doc: &mut DocumentMut, name: &str) -> Option<Item> {
    doc.get_mut("mcp_servers")
        .and_then(Item::as_table_mut)
        .and_then(|table| table.remove(name))
}

fn server_to_item(config: &McpServerConfig) -> Result<Item, String> {
    let serialized =
        toml::to_string(config).map_err(|e| format!("Failed to serialize server config: {}", e))?;
    let mut table = serialized
        .parse::<DocumentMut>()
        .map_err(|e| format!("Failed to parse serialized server config: {}", e))?
        .as_table_mut()
        .clone();
    inline_child_table(&mut table, "env");
    inline_child_table(&mut table, "headers");
    Ok(Item::Table(table))
}

fn doc_counts(doc: &DocumentMut) -> (usize, usize) {
    if let Some(table) = doc.get("mcp_servers").and_then(Item::as_table) {
        let mut active = 0;
        let mut disabled = 0;
        for (_, item) in table.iter() {
            if server_item_enabled(item) {
                active += 1;
            } else {
                disabled += 1;
            }
        }
        (active, disabled)
    } else {
        (0, 0)
    }
}

fn partition_server_keys(doc: &DocumentMut) -> (Vec<String>, Vec<String>) {
    if let Some(table) = doc.get("mcp_servers").and_then(Item::as_table) {
        let mut active = Vec::new();
        let mut disabled = Vec::new();
        for (k, item) in table.iter() {
            if server_item_enabled(item) {
                active.push(k.to_string());
            } else {
                disabled.push(k.to_string());
            }
        }
        (active, disabled)
    } else {
        (Vec::new(), Vec::new())
    }
}

fn server_item_enabled(item: &Item) -> bool {
    item.as_table()
        .and_then(|table| table.get("enabled"))
        .and_then(Item::as_value)
        .and_then(|value| value.as_bool())
        .map(|flag| flag)
        .unwrap_or(true)
}

fn get_server_table_mut<'a>(doc: &'a mut DocumentMut, name: &str) -> Option<&'a mut Table> {
    doc.get_mut("mcp_servers")
        .and_then(Item::as_table_mut)
        .and_then(|servers| servers.get_mut(name))
        .and_then(Item::as_table_mut)
}

fn set_enabled_field(table: &mut Table, enabled: bool) {
    if enabled {
        table.remove("enabled");
    } else {
        table.insert("enabled", value(false));
    }
}

fn set_enabled_on_item(item: &mut Item, enabled: bool) -> Result<(), String> {
    if let Item::Table(table) = item {
        set_enabled_field(table, enabled);
        Ok(())
    } else {
        Err("server config is not a table".into())
    }
}

fn migrate_disabled_table(doc: &mut DocumentMut) -> Result<(), String> {
    let entries = doc
        .get("disabled_mcp_servers")
        .and_then(Item::as_table)
        .map(|table| {
            table
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect::<Vec<_>>()
        });

    if let Some(disabled_entries) = entries {
        let servers_table = ensure_table(doc, "mcp_servers")?;
        for (name, mut item) in disabled_entries {
            set_enabled_on_item(&mut item, false).ok();
            servers_table.insert(&name, item);
        }
        doc.as_table_mut().remove("disabled_mcp_servers");
    }
    Ok(())
}

fn partition_config_states(
    servers: &HashMap<String, McpServerConfig>,
) -> (usize, usize) {
    let mut active = 0;
    let mut disabled = 0;
    for cfg in servers.values() {
        if cfg.is_enabled() {
            active += 1;
        } else {
            disabled += 1;
        }
    }
    (active, disabled)
}

fn inline_child_table(table: &mut Table, key: &str) {
    if let Some(item) = table.get_mut(key) {
        if let Item::Table(child) = item {
            let mut inline = InlineTable::default();
            for (k, v) in child.iter() {
                if let Some(val) = v.as_value().cloned() {
                    inline.insert(k, val);
                } else {
                    // Fallback: convert item to string for complex structures
                    inline.insert(k, Value::from(v.to_string()));
                }
            }
            *item = Item::Value(Value::InlineTable(inline));
        }
    }
}

pub async fn add_mcp_server(name: String, config: McpServerConfig) -> Result<(), String> {
    let _guard = CODEX_CFG_LOCK.lock().await;
    let config_path = get_config_path()?;
    let mut doc = load_document(&config_path).await?;
    let table = ensure_table(&mut doc, "mcp_servers")?;
    let item = server_to_item(&config)?;
    table.insert(&name, item);
    persist_document(&config_path, doc).await
}

pub async fn delete_mcp_server(name: String) -> Result<(), String> {
    println!("[Codex] delete request: {}", name);
    let _guard = CODEX_CFG_LOCK.lock().await;
    let config_path = get_config_path()?;
    let mut doc = load_document(&config_path).await?;
    let (active_keys, disabled_keys) = partition_server_keys(&doc);
    println!(
        "[Codex] before delete: active_keys={:?} disabled_keys={:?}",
        active_keys, disabled_keys
    );
    let mut removed = false;
    if remove_entry(&mut doc, &name).is_some() {
        removed = true;
    }
    if !removed {
        return Err(format!("MCP server '{}' not found", name));
    }
    println!("[Codex] delete matched, saving");
    persist_document(&config_path, doc).await
}

// Disabled servers support for Codex
pub async fn list_disabled() -> Result<HashMap<String, McpServerConfig>, String> {
    let config = load_config().await?;
    let mut disabled: HashMap<String, McpServerConfig> = config
        .mcp_servers
        .into_iter()
        .filter(|(_, cfg)| !cfg.is_enabled())
        .collect();
    disabled.extend(config.disabled_mcp_servers);
    Ok(disabled)
}

pub async fn disable(name: &str) -> Result<(), String> {
    let _guard = CODEX_CFG_LOCK.lock().await;
    let config_path = get_config_path()?;
    let mut doc = load_document(&config_path).await?;
    println!(
        "[Codex] disable request: {} | active_keys={:?}",
        name,
        partition_server_keys(&doc).0
    );
    if let Some(server_table) = get_server_table_mut(&mut doc, name) {
        set_enabled_field(server_table, false);
        println!("[Codex] disable matched, saving");
        persist_document(&config_path, doc).await
    } else {
        println!("[Codex] disable miss");
        Ok(())
    }
}

pub async fn enable(name: &str) -> Result<(), String> {
    let _guard = CODEX_CFG_LOCK.lock().await;
    let config_path = get_config_path()?;
    let mut doc = load_document(&config_path).await?;
    println!(
        "[Codex] enable request: {} | disabled_keys={:?}",
        name,
        partition_server_keys(&doc).1
    );
    if let Some(server_table) = get_server_table_mut(&mut doc, name) {
        set_enabled_field(server_table, true);
        println!("[Codex] enable matched, saving");
        persist_document(&config_path, doc).await
    } else {
        println!("[Codex] enable miss");
        Ok(())
    }
}

pub async fn update_disabled(name: &str, server: McpServerConfig) -> Result<(), String> {
    let _guard = CODEX_CFG_LOCK.lock().await;
    let config_path = get_config_path()?;
    let mut doc = load_document(&config_path).await?;
    println!(
        "[Codex] update_disabled: {} | disabled_keys(before)={:?}",
        name,
        partition_server_keys(&doc).1
    );
    let table = ensure_table(&mut doc, "mcp_servers")?;
    let mut item = server_to_item(&server)?;
    set_enabled_on_item(&mut item, false)?;
    table.insert(name, item);
    println!(
        "[Codex] update_disabled saved | disabled_keys(after)={:?}",
        partition_server_keys(&doc).1
    );
    persist_document(&config_path, doc).await
}
