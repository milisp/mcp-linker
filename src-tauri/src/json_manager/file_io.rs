use super::entry_format;
use super::utils::get_key_by_client;
use serde_json::{json, Value};
use std::io::ErrorKind;
use std::path::Path;
use tokio::fs;
use tokio::task;

/// Hermes keeps its servers in a YAML file; every other config is JSON.
fn is_yaml(path: &Path) -> bool {
    path.extension().is_some_and(|ext| ext == "yaml" || ext == "yml")
}

fn parse_yaml(text: &str) -> Result<Value, String> {
    if text.trim().is_empty() {
        return Ok(json!({}));
    }
    serde_yaml::from_str(text).map_err(|e| format!("Failed to parse YAML: {}", e))
}

/// Reads a client's config with its servers in the common entry shape (see `entry_format`).
pub async fn read_client_file(path: &Path, client: &str) -> Result<Value, String> {
    let mut file = read_json_file(path).await?;
    entry_format::servers_to_common(client, get_key_by_client(client), &mut file);
    Ok(file)
}

/// Writes a config read with `read_client_file`, servers back in the client's own shape.
pub async fn write_client_file(path: &Path, client: &str, content: &Value) -> Result<(), String> {
    let mut file = content.clone();
    entry_format::servers_from_common(client, get_key_by_client(client), &mut file);
    write_json_file(path, &file).await
}

/// Read a JSON (or, by extension, YAML) config file asynchronously
pub async fn read_json_file(path: &Path) -> Result<Value, String> {
    let path_buf = path.to_path_buf();
    let content_result = fs::read_to_string(&path_buf).await;
    let parse = if is_yaml(path) { parse_yaml } else { parse_jsonc };

    match content_result {
        Ok(content) => task::spawn_blocking(move || parse(&content))
        .await
        .map_err(|e| format!("Failed to run blocking task for JSON parsing: {}", e))?,
        Err(e) => {
            if e.kind() == ErrorKind::NotFound {
                Ok(json!({})) // Return empty JSON for Not Found
            } else {
                Err(format!("Failed to read file: {}", e))
            }
        }
    }
}

/// Parses JSON that may contain `//` and `/* */` comments and trailing commas,
/// as VS Code's mcp.json (JSONC) and hand-edited configs often do.
pub fn parse_jsonc(text: &str) -> Result<Value, String> {
    serde_json::from_str(text)
        .or_else(|_| serde_json::from_str(&strip_jsonc(text)))
        .map_err(|e| format!("Failed to parse JSON: {}", e))
}

/// Removes comments and trailing commas outside of strings.
pub fn strip_jsonc(text: &str) -> String {
    remove_trailing_commas(&remove_comments(text))
}

/// Copies a string literal starting at `chars[i]` (the opening quote) and returns the index after it.
fn copy_string(chars: &[char], mut i: usize, out: &mut String) -> usize {
    out.push(chars[i]);
    i += 1;
    while i < chars.len() {
        out.push(chars[i]);
        match chars[i] {
            '\\' if i + 1 < chars.len() => {
                out.push(chars[i + 1]);
                i += 2;
            }
            '"' => return i + 1,
            _ => i += 1,
        }
    }
    i
}

fn remove_comments(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < chars.len() {
        match (chars[i], chars.get(i + 1)) {
            ('"', _) => i = copy_string(&chars, i, &mut out),
            ('/', Some('/')) => {
                while i < chars.len() && chars[i] != '\n' {
                    i += 1;
                }
            }
            ('/', Some('*')) => {
                i += 2;
                while i < chars.len() && !(chars[i] == '*' && chars.get(i + 1) == Some(&'/')) {
                    i += 1;
                }
                i = (i + 2).min(chars.len());
                out.push(' ');
            }
            (c, _) => {
                out.push(c);
                i += 1;
            }
        }
    }
    out
}

fn remove_trailing_commas(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < chars.len() {
        match chars[i] {
            '"' => i = copy_string(&chars, i, &mut out),
            ',' if matches!(chars[i + 1..].iter().find(|c| !c.is_whitespace()), Some('}') | Some(']')) => i += 1,
            c => {
                out.push(c);
                i += 1;
            }
        }
    }
    out
}

fn has_comments(text: &str, yaml: bool) -> bool {
    if yaml {
        text.lines().any(|line| line.trim_start().starts_with('#'))
    } else {
        serde_json::from_str::<Value>(text).is_err() && parse_jsonc(text).is_ok()
    }
}

/// Write a JSON (or, by extension, YAML) config file asynchronously
pub async fn write_json_file(path: &Path, content: &Value) -> Result<(), String> {
    let path_buf = path.to_path_buf();
    let content_cloned = content.clone(); // Clone for the blocking task

    // Ensure directory exists
    if let Some(parent) = path_buf.parent()
        && !parent.exists()
    {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Serialize in a blocking task
    let yaml = is_yaml(path);
    let json_string_result = task::spawn_blocking(move || {
        if yaml {
            serde_yaml::to_string(&content_cloned).map_err(|e| format!("Failed to serialize YAML: {}", e))
        } else {
            serde_json::to_string_pretty(&content_cloned)
                .map_err(|e| format!("Failed to serialize JSON: {}", e))
        }
    })
    .await
    .map_err(|e| format!("Failed to run blocking task for JSON serialization: {}", e))?;

    let json_string = json_string_result?; // Handle the inner Result from the blocking task

    // Comments cannot survive a rewrite; keep the commented original once.
    if let Ok(existing) = fs::read_to_string(&path_buf).await
        && has_comments(&existing, yaml)
    {
        let mut backup = path_buf.clone().into_os_string();
        backup.push(".bak");
        fs::write(&backup, existing)
            .await
            .map_err(|e| format!("Failed to back up commented config: {}", e))?;
    }

    // Write the JSON file asynchronously
    fs::write(&path_buf, json_string)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn parses_comments_and_trailing_commas() {
        let text = r#"{
            // user servers
            "servers": {
                "a": { "command": "npx", "args": ["-y", "pkg",], }, /* block */
            },
            "inputs": [ /* none */ ],
        }"#;
        assert_eq!(
            parse_jsonc(text).unwrap(),
            json!({ "servers": { "a": { "command": "npx", "args": ["-y", "pkg"] } }, "inputs": [] })
        );
    }

    #[test]
    fn keeps_comment_markers_and_commas_inside_strings() {
        let text = r#"{ "url": "https://a.dev/x", "note": "a, } // not /* a comment */", "q": "say \"hi\" // ok", }"#;
        assert_eq!(
            parse_jsonc(text).unwrap(),
            json!({ "url": "https://a.dev/x", "note": "a, } // not /* a comment */", "q": "say \"hi\" // ok" })
        );
    }

    #[test]
    fn keeps_commas_between_items_followed_by_comments() {
        assert_eq!(parse_jsonc("[1, // one\n 2]").unwrap(), json!([1, 2]));
    }

    #[tokio::test]
    async fn round_trips_yaml_and_backs_up_its_comments() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.yaml");
        let original = "# Hermes\nmodel: x\nmcp_servers:\n  time:\n    command: uvx\n    args: [mcp-server-time]\n";
        std::fs::write(&path, original).unwrap();

        let value = read_json_file(&path).await.unwrap();
        assert_eq!(value, json!({ "model": "x", "mcp_servers": { "time": { "command": "uvx", "args": ["mcp-server-time"] } } }));
        write_json_file(&path, &value).await.unwrap();
        assert_eq!(std::fs::read_to_string(dir.path().join("config.yaml.bak")).unwrap(), original);
        assert_eq!(read_json_file(&path).await.unwrap(), value);
        // Key order survives the rewrite.
        assert!(std::fs::read_to_string(&path).unwrap().starts_with("model: x"));
    }

    #[test]
    fn still_rejects_broken_json() {
        assert!(parse_jsonc("{ \"a\": }").is_err());
    }

    #[tokio::test]
    async fn backs_up_a_commented_file_before_rewriting_it() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("mcp.json");
        let original = "{\n  // keep me\n  \"servers\": {}\n}\n";
        std::fs::write(&path, original).unwrap();

        let value = read_json_file(&path).await.unwrap();
        write_json_file(&path, &value).await.unwrap();

        assert_eq!(std::fs::read_to_string(dir.path().join("mcp.json.bak")).unwrap(), original);
        assert_eq!(read_json_file(&path).await.unwrap(), json!({ "servers": {} }));

        // Plain JSON afterwards: no new backup is taken.
        std::fs::remove_file(dir.path().join("mcp.json.bak")).unwrap();
        write_json_file(&path, &value).await.unwrap();
        assert!(!dir.path().join("mcp.json.bak").exists());
    }
}
