use std::process::Command;

mod uv_installer;

// Fixed: Consistent parameter naming
#[tauri::command]
pub async fn install_command(
    package_name: String,
    package_manager: Option<String>, // Fixed: Changed from package_manage to package_manager
) -> Result<String, String> {
    println!("Starting installation of package: {}", package_name);
    let manager = package_manager.unwrap_or_else(|| get_default_package_manager());
    println!("Using package manager: {}", manager);

    match std::env::consts::OS {
        "macos" => install_on_macos(&package_name, &manager).await,
        "windows" => install_on_windows(&package_name, &manager).await,
        "linux" => install_on_linux(&package_name, &manager).await,
        _ => Err("Unsupported operating system".to_string()),
    }
}

// Added: Function to determine default package manager
fn get_default_package_manager() -> String {
    match std::env::consts::OS {
        "macos" => "brew".to_string(),
        "windows" => "winget".to_string(),
        "linux" => {
            // Check which package manager is available
            if Command::new("apt").arg("--version").output().is_ok() {
                "apt".to_string()
            } else if Command::new("dnf").arg("--version").output().is_ok() {
                "dnf".to_string()
            } else if Command::new("pacman").arg("--version").output().is_ok() {
                "pacman".to_string()
            } else {
                "apt".to_string() // Default fallback
            }
        }
        _ => "unknown".to_string(),
    }
}

// Fixed: Made async and improved error handling
async fn install_on_macos(package_name: &str, manager: &str) -> Result<String, String> {
    println!("Checking if {} is installed...", manager);

    if manager == "brew" {
        let brew_exists = Command::new("which")
            .arg("brew")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);

        println!("Brew exists: {}", brew_exists);

        if brew_exists {
            match execute_brew_install(package_name).await {
                Ok(result) => return Ok(result),
                Err(_) => {
                    // If brew installation fails, try network installation
                    if package_name == "uv" {
                        use uv_installer::install_uv_network;
                        return install_uv_network();
                    }
                }
            }
        }
    }

    Err(format!(
        "{} is not installed. Please install {} first.",
        manager, manager
    ))
}

// Fixed: Separated brew installation logic
async fn execute_brew_install(package_name: &str) -> Result<String, String> {
    println!("Executing brew install command...");

    // Fixed: Better command execution with proper error handling
    let result = tokio::process::Command::new("brew")
        .args(&["install", package_name])
        .output()
        .await;

    match result {
        Ok(output) => {
            println!("Installation command completed");
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            println!("STDOUT: {}", stdout);
            println!("STDERR: {}", stderr);

            if output.status.success() {
                println!("Installation successful");
                Ok("Installed successfully".to_string())
            } else {
                // More informative error messages
                let error_msg = if !stderr.is_empty() {
                    stderr.to_string()
                } else if !stdout.is_empty() {
                    stdout.to_string()
                } else {
                    "Unknown installation error".to_string()
                };
                Err(format!("Installation failed: {}", error_msg))
            }
        }
        Err(e) => {
            println!("Installation command failed to execute: {}", e);
            Err(format!("Failed to execute brew install: {}", e))
        }
    }
}

// Fixed: Made async and improved error handling
async fn install_on_windows(package_name: &str, _manager: &str) -> Result<String, String> {
    let install_cmd = match package_name.to_lowercase().as_str() {
        "python" | "python3" => "winget install --id Python.Python.3 -e".to_string(),
        "node" | "nodejs" => "winget install --id OpenJS.NodeJS.LTS -e".to_string(),
        _ => format!("winget install {}", package_name),
    };

    match tokio::process::Command::new("powershell")
        .args(&["-Command", &install_cmd])
        .output()
        .await
    {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);

            if result.status.success() {
                Ok("Installed successfully".to_string())
            } else {
                // If winget installation fails, try network installation for UV
                if package_name == "uv" {
                    use uv_installer::install_uv_network;
                    return install_uv_network();
                }

                let error_msg = if !stderr.is_empty() {
                    stderr.to_string()
                } else if !stdout.is_empty() {
                    stdout.to_string()
                } else {
                    "Unknown installation error".to_string()
                };
                Err(format!("Installation failed: {}", error_msg))
            }
        }
        Err(e) => {
            // If winget command fails, try network installation for UV
            if package_name == "uv" {
                use uv_installer::install_uv_network;
                return install_uv_network();
            }
            Err(format!("Failed to execute winget: {}", e))
        }
    }
}

// Fixed: Made async and improved Linux package manager detection
async fn install_on_linux(package_name: &str, manager: &str) -> Result<String, String> {
    let (cmd, args) = match manager {
        "apt" => ("sudo", vec!["apt", "install", "-y", package_name]),
        "dnf" => ("sudo", vec!["dnf", "install", "-y", package_name]),
        "pacman" => ("sudo", vec!["pacman", "-S", "--noconfirm", package_name]),
        _ => {
            // Auto-detect package manager
            if is_command_available("apt").await {
                ("sudo", vec!["apt", "install", "-y", package_name])
            } else if is_command_available("dnf").await {
                ("sudo", vec!["dnf", "install", "-y", package_name])
            } else if is_command_available("pacman").await {
                ("sudo", vec!["pacman", "-S", "--noconfirm", package_name])
            } else {
                return Err("No supported Linux package manager found".to_string());
            }
        }
    };

    match tokio::process::Command::new(cmd).args(&args).output().await {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);

            if result.status.success() {
                Ok("Installed successfully".to_string())
            } else {
                // If package manager installation fails, try network installation for UV
                if package_name == "uv" {
                    use uv_installer::install_uv_network;
                    return install_uv_network();
                }

                let error_msg = if !stderr.is_empty() {
                    stderr.to_string()
                } else if !stdout.is_empty() {
                    stdout.to_string()
                } else {
                    "Unknown installation error".to_string()
                };
                Err(format!("Installation failed: {}", error_msg))
            }
        }
        Err(e) => {
            // If package manager command fails, try network installation for UV
            if package_name == "uv" {
                use uv_installer::install_uv_network;
                return install_uv_network();
            }
            Err(format!("Failed to execute installation command: {}", e))
        }
    }
}

// Added: Helper function to check if command is available
async fn is_command_available(cmd: &str) -> bool {
    tokio::process::Command::new("which")
        .arg(cmd)
        .output()
        .await
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Fixed: Improved command existence check with hidden window on Windows
#[tauri::command]
pub async fn check_command_exists(command: String) -> Result<bool, String> {
    let exists = match std::env::consts::OS {
        "windows" => {
            use std::process::Stdio;
            #[cfg(windows)]
            {
                tokio::process::Command::new("cmd")
                    .args(&["/C", "where", &command])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .stdin(Stdio::null())
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .output()
                    .await
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            }
            #[cfg(not(windows))]
            {
                tokio::process::Command::new("cmd")
                    .args(&["/C", "where", &command])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .stdin(Stdio::null())
                    .output()
                    .await
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            }
        }
        _ => tokio::process::Command::new("which")
            .arg(&command)
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false),
    };

    Ok(exists)
}
