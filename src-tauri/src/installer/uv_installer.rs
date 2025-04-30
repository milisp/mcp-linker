use std::process::Command;

#[allow(dead_code)]
pub fn install_uv_by_curl() -> Result<String, String> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        // Install UV using curl for macOS and Linux
        let result = Command::new("curl")
            .args(&["-LsSf", "https://astral.sh/uv/install.sh"])
            .stdout(std::process::Stdio::piped())
            .spawn()
            .and_then(|child| Command::new("sh").stdin(child.stdout.unwrap()).output());

        match result {
            Ok(output) => {
                if output.status.success() {
                    Ok("UV installed successfully".to_string())
                } else {
                    let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
                    if error_msg.is_empty() {
                        Err("UV installation failed with no error message".to_string())
                    } else {
                        Err(error_msg)
                    }
                }
            }
            Err(e) => Err(format!("Failed to execute UV installation script: {}", e)),
        }
    }

    #[cfg(target_os = "windows")]
    {
        // For Windows, use PowerShell to install UV
        let result = Command::new("powershell")
            .args(&[
                "-Command",
                "iwr https://astral.sh/uv/install.ps1 -useb | iex",
            ])
            .output();

        match result {
            Ok(output) => {
                if output.status.success() {
                    Ok("UV installed successfully".to_string())
                } else {
                    let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
                    if error_msg.is_empty() {
                        Err("UV installation failed with no error message".to_string())
                    } else {
                        Err(error_msg)
                    }
                }
            }
            Err(e) => Err(format!("Failed to execute UV installation script: {}", e)),
        }
    }

    // Fallback for unsupported operating systems
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Err("UV installation is not supported on this operating system".to_string())
    }
}