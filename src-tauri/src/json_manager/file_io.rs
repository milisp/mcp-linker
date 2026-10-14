use serde_json::{json, Value};
use std::io::ErrorKind;
use std::path::Path;
use tokio::fs;
use tokio::task;

/// Read JSON file asynchronously
pub async fn read_json_file(path: &Path) -> Result<Value, String> {
    let path_buf = path.to_path_buf();
    let content_result = fs::read_to_string(&path_buf).await;

    match content_result {
        Ok(content) => task::spawn_blocking(move || parse_jsonc(&content))
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

/// Write JSON file asynchronously
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

    // Serialize JSON in a blocking task
    let json_string_result = task::spawn_blocking(move || {
        serde_json::to_string_pretty(&content_cloned)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))
    })
    .await
    .map_err(|e| format!("Failed to run blocking task for JSON serialization: {}", e))?;

    let json_string = json_string_result?; // Handle the inner Result from the blocking task

    // Comments cannot survive a rewrite; keep the commented original once.
    if let Ok(existing) = fs::read_to_string(&path_buf).await
        && serde_json::from_str::<Value>(&existing).is_err()
        && parse_jsonc(&existing).is_ok()
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
