//! YAML output for Hermes, whose `config.yaml` is read with PyYAML (YAML 1.1).
//! Rust YAML serializers leave strings such as `on`, `no` or `2001-12-14` plain,
//! which PyYAML then reads as booleans or dates, so we emit YAML ourselves and
//! quote every string that is not unmistakably a plain string. Writing a client
//! config only replaces its servers block and keeps the rest of the file as is.

use serde_json::Value;

/// A whole YAML document; used when there is no existing file to splice into.
pub fn to_yaml(value: &Value) -> String {
    match value {
        Value::Object(map) if !map.is_empty() => {
            let mut out = String::new();
            emit_map(&mut out, map, 0);
            out
        }
        other => format!("{}\n", scalar(other)),
    }
}

/// `text` with its top-level `key:` block replaced by `value`, or appended when missing.
/// Comment lines right before the next top-level key stay with that key.
pub fn splice_key(text: &str, key: &str, value: &Value) -> String {
    let mut block = String::new();
    emit_entry(&mut block, key, value, 0);
    let lines: Vec<&str> = text.split_inclusive('\n').collect();
    let is_key_line = |line: &str| {
        line.strip_prefix(key)
            .and_then(|rest| rest.strip_prefix(':'))
            .is_some_and(|rest| rest.is_empty() || rest.starts_with([' ', '\n', '\r', '\t']))
    };
    let Some(start) = lines.iter().position(|line| is_key_line(line)) else {
        let mut out = text.to_string();
        if !out.is_empty() && !out.ends_with('\n') {
            out.push('\n');
        }
        out.push_str(&block);
        return out;
    };
    let top_level = |line: &str| !line.trim().is_empty() && !line.starts_with([' ', '\t', '#']);
    let mut end = lines[start + 1..].iter().position(|line| top_level(line)).map_or(lines.len(), |i| start + 1 + i);
    while end > start + 1 && (lines[end - 1].trim().is_empty() || lines[end - 1].starts_with('#')) {
        end -= 1;
    }
    let mut out: String = lines[..start].concat();
    out.push_str(&block);
    out.push_str(&lines[end..].concat());
    out
}

fn pad(out: &mut String, indent: usize) {
    out.extend(std::iter::repeat_n(' ', indent));
}

fn is_block(value: &Value) -> bool {
    match value {
        Value::Object(map) => !map.is_empty(),
        Value::Array(items) => !items.is_empty(),
        _ => false,
    }
}

fn emit_entry(out: &mut String, key: &str, value: &Value, indent: usize) {
    pad(out, indent);
    out.push_str(&string(key));
    out.push(':');
    match value {
        Value::Object(map) if !map.is_empty() => {
            out.push('\n');
            emit_map(out, map, indent + 2);
        }
        // Sequences under a key are not indented, as PyYAML writes them.
        Value::Array(items) if !items.is_empty() => {
            out.push('\n');
            emit_seq(out, items, indent);
        }
        other => {
            out.push(' ');
            out.push_str(&scalar(other));
            out.push('\n');
        }
    }
}

fn emit_map(out: &mut String, map: &serde_json::Map<String, Value>, indent: usize) {
    for (key, value) in map {
        emit_entry(out, key, value, indent);
    }
}

fn emit_seq(out: &mut String, items: &[Value], indent: usize) {
    for item in items {
        pad(out, indent);
        out.push('-');
        if !is_block(item) {
            out.push(' ');
            out.push_str(&scalar(item));
            out.push('\n');
            continue;
        }
        // Emit the nested block two deeper, then pull its first line up next to the dash.
        let mut nested = String::new();
        match item {
            Value::Object(map) => emit_map(&mut nested, map, indent + 2),
            Value::Array(inner) => emit_seq(&mut nested, inner, indent + 2),
            _ => unreachable!(),
        }
        out.push(' ');
        out.push_str(&nested[indent + 2..]);
    }
}

fn scalar(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => string(s),
        Value::Object(_) => "{}".into(),
        Value::Array(_) => "[]".into(),
    }
}

/// Plain only when no YAML 1.1 or 1.2 reader could take it for anything but a string;
/// otherwise double-quoted, whose escapes are a superset of JSON's.
fn string(s: &str) -> String {
    const NOT_STRINGS: &[&str] = &["y", "n", "yes", "no", "on", "off", "true", "false", "null"];
    let plain = s.starts_with(|c: char| c.is_ascii_alphabetic() || c == '_' || c == '/')
        && s.chars().all(|c| c.is_ascii_alphanumeric() || "_./@+-".contains(c))
        && !NOT_STRINGS.contains(&s.to_ascii_lowercase().as_str());
    if plain { s.to_string() } else { serde_json::to_string(s).unwrap() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn quotes_strings_yaml_1_1_reads_as_other_types() {
        for s in ["on", "Off", "yes", "N", "true", "null", "~", "1_000", "2001-12-14", "1.0", "0o17", ".inf", "", "a b", "a: b", "#x", "${TZ}", "https://x/y"] {
            assert!(string(s).starts_with('"'), "{s}");
        }
        for s in ["uvx", "mcp-server-time", "nvidia/nemotron-3", "hermes-cli", "auto", "/usr/bin/python3", "_x"] {
            assert_eq!(string(s), s);
        }
    }

    #[test]
    fn emits_block_style_like_pyyaml() {
        let value = json!({
            "time": { "command": "uvx", "args": ["mcp-server-time", "--tz=UTC"], "env": { "TZ": "${TZ}" } },
            "docs": { "url": "https://s", "headers": {}, "enabled": false, "list": [{ "a": 1, "b": [true] }] }
        });
        assert_eq!(to_yaml(&value), "\
time:
  command: uvx
  args:
  - mcp-server-time
  - \"--tz=UTC\"
  env:
    TZ: \"${TZ}\"
docs:
  url: \"https://s\"
  headers: {}
  enabled: false
  list:
  - a: 1
    b:
    - true
");
        let back: Value = serde_yaml::from_str(&to_yaml(&value)).unwrap();
        assert_eq!(back, value);
    }

    #[test]
    fn splices_only_the_servers_block() {
        let text = "# Hermes\nmodel:\n  default: x\nmcp_servers:\n  old:\n    command: a\n# about display\ndisplay:\n  memory_notifications: 'on'\n";
        let out = splice_key(text, "mcp_servers", &json!({ "new": { "command": "b" } }));
        assert_eq!(out, "# Hermes\nmodel:\n  default: x\nmcp_servers:\n  new:\n    command: b\n# about display\ndisplay:\n  memory_notifications: 'on'\n");
    }

    #[test]
    fn appends_a_missing_block_and_ignores_similar_keys() {
        let text = "mcp_servers_extra: 1\nmodel: x";
        let out = splice_key(text, "mcp_servers", &json!({}));
        assert_eq!(out, "mcp_servers_extra: 1\nmodel: x\nmcp_servers: {}\n");
    }

    #[test]
    fn replaces_a_block_at_the_end_of_the_file() {
        let out = splice_key("a: 1\nmcp_servers: {}\n", "mcp_servers", &json!({ "t": { "url": "https://s" } }));
        assert_eq!(out, "a: 1\nmcp_servers:\n  t:\n    url: \"https://s\"\n");
    }
}
