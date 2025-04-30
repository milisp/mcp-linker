<p align="center">
  <img src="public/logo.png" alt="Project Logo" width="200" />
</p>

<p align="center">
  📘 Available languages: 
  <strong>English</strong> | 
  <a href="./docs/README.zh-CN.md">简体中文</a> | 
  <a href="./docs/README.ja-JP.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/milisp/mcp-linker/stargazers">
    ⭐ If you find this project useful, please consider giving it a star!
  </a>
  <br/>
  <a href="https://github.com/milisp/mcp-linker">
    <img src="https://img.shields.io/github/stars/milisp/mcp-linker?style=social" alt="GitHub stars"/>
    <img src="https://img.shields.io/github/forks/milisp/mcp-linker?style=social" alt="GitHub forks"/>
  </a>
</p>

# MCP Linker

>Easily add a **Model Context Protocol (MCP) server** to your MCP client (**Claude Cursor windsurf...**) with just two clicks: **Get** and **Add**. Support macos win

## 🔽 Download MCP Linker

👉 [Download on 🐙Gumroad](https://wei40680.gumroad.com/l/jdbuvc?wanted=true)
👉 [Download on github release](https://github.com/milisp/mcp-linker/releases)

## ✨ Features

✅ One-click to add MCP servers  
✅ Supports multiple MCP server configurations  
✅ Open-source and community-driven  
✅ Favorites: Mark servers as favorites for quick access  
✅ Recently Used: Automatically save and display recently added servers  
✅ Windows Support: Now also works on Windows (experimental)  
✅ Improved error handling and installation guide

🗨 [Feedback or Questions](https://github.com/milisp/mcp-linker/discussions)

## Requirements

Before running this project, ensure you have the following installed:

- Node.js 
- bun (or pnpm)
- Rust toolchain (stable) for Tauri

## Install

```bash
git clone https://github.com/milisp/mcp-linker
cd mcp-linker
bun install
bun tauri dev
# yarn install
# yarn tauri dev
# pnpm install
# pnpm tauri dev
```

> **Disclaimer:** If you face any issues, delete the `package-lock.json` file and the `node_modules` directory, then run:
> ```bash
> npm cache clean --force
> npm install
> ```
> Again, if you face any errors, remove the `package-lock.json` file and the `node_modules` directory again, then run:
> ```
> npm cache clean --force
> npm install --legacy-peer-deps
> ```
>

## 🚀 Quick Start

1. **Browse & Select**: Choose an MCP server from the available list.  
2. **Install**: Click **"Get"** to show configure of server.  
3. **Activate**: Click **"Add"** to integrate it with your MCP client.
> **Tip:** Favorites and recently used servers are saved locally for your convenience!

## 🌐 Official Servers

Check out the list of [official MCP servers](https://github.com/modelcontextprotocol/servers).

## 🖼️ Screenshots

### Server Discovery
![Discover Screenshot](./images/home.png)

### Configuration Example
![Config Screenshot](./images/config.png)

### Manage Example
![Manage Screenshot](./images/manager.png)

---

## 🤝 Contributing

We welcome contributions!:

1. **Fork & Clone** this repository.
2. **Submit a Pull Request** with your changes.

## 🎉 Contributors

Thanks to the following contributors for improving this project:

- [@eltociear](https://github.com/eltociear) — Japanese translation
- [@devilcoder01](https://github.com/devilcoder01) — improved Windows build compatibility and project setup instructions

---

[![Star History Chart](https://api.star-history.com/svg?repos=milisp/mcp-linker&type=Date)](https://star-history.com/#milisp/mcp-linker)