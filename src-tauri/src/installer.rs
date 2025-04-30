use std::process::Command;

mod uv_installer;


#[tauri::command]
pub fn install_command(
    package_name: String,
    package_manage: Option<String>,
) -> Result<String, String> {
    println!("Starting installation of package: {}", package_name); // 添加初始日志
    let manager = package_manage.unwrap_or("brew".to_string());
    println!("Using package manager: {}", manager); // 显示使用的包管理器
    
    #[cfg(target_os = "macos")]
    {
        // Check if brew is available
        println!("Checking if brew is installed..."); // 检查brew状态
        let brew_exists = Command::new("which")
            .arg("brew")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);

        println!("Brew exists: {}", brew_exists); // 显示brew检查结果

        if brew_exists {
            println!("Executing brew install command..."); // 执行brew安装前
            let result = Command::new("sh")
                .args(&["-c", &format!("brew install {}", package_name)])
                .output();

            match result {
                Ok(output) => {
                    println!("Installation command completed"); // 安装命令完成
                    if output.status.success() {
                        println!("Installation successful"); // 安装成功
                        return Ok("installed successfully".to_string());
                    } else {
                        println!("Installation failed"); // 安装失败
                        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                        println!("STDERR: {}", stderr); // 显示错误输出
                        println!("STDOUT: {}", stdout); // 显示标准输出
                        if !stderr.is_empty() {
                            return Err(stderr);
                        } else if !stdout.is_empty() {
                            return Err(stdout);
                        } else {
                            return Err("Unknown installation error".to_string());
                        }
                    }
                }
                Err(e) => {
                    println!("Installation command failed to execute: {}", e); // 命令执行失败
                    return Err(format!("Failed to execute brew install: {}", e))
                },
            }
        }

        // If brew is not available and it's a UV installation request, fall back to curl
        if package_name == "uv" || manager.contains("curl") {
            use uv_installer::install_uv_by_curl;
            return install_uv_by_curl();
        }

        return Err("Homebrew is not installed. Please install Homebrew first.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let result = Command::new("powershell")
            .args(&["-Command", &format!("winget install {}", package_name)])
            .output().map_err(|e| e.to_string())?;


        if result.status.success() {
            return Ok("installed successfully".to_string());
        } else {
            let stderr = String::from_utf8_lossy(&result.stderr).to_string();
            let stdout = String::from_utf8_lossy(&result.stdout).to_string();
            return if !stderr.is_empty() {
                Err(stderr)
            } else if !stdout.is_empty() {
                Err(stdout)
            } else {
                Err("Unknown installation error".to_string())
            };
        }
    }

    #[cfg(target_os = "linux")]
    {
        let result = if Command::new("apt").arg("-v").output().is_ok() {
            Command::new("sudo")
                .args(&["apt", "install", "-y", &package_name])
                .output()
        } else if Command::new("dnf").arg("-v").output().is_ok() {
            Command::new("sudo")
                .args(&["dnf", "install", "-y", &package_name])
                .output()
        } else if Command::new("pacman").arg("-V").output().is_ok() {
            Command::new("sudo")
                .args(&["pacman", "-S", "--noconfirm", &package_name])
                .output()
        } else {
            return Err("Unsupported Linux package manager".to_string());
        };

        match result {
            Ok(output) => {
                if output.status.success() {
                    Ok("installed successfully".to_string())
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    if !stderr.is_empty() {
                        Err(stderr)
                    } else if !stdout.is_empty() {
                        Err(stdout)
                    } else {
                        Err("Unknown installation error".to_string())
                    }
                }
            }
            Err(e) => Err(format!("Failed to execute installation command: {}", e)),
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    Err("Unsupported operating system".to_string())
}

// Additional command to check if a command exists
#[tauri::command]
pub fn check_command_exists(command: String) -> Result<bool, String> {
    let exists = match std::env::consts::OS {
        "windows" => Command::new("cmd")
            .args(&["/C", "where", &command])
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false),
        _ => Command::new("which")
            .arg(&command)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false),
    };

    Ok(exists)
}
