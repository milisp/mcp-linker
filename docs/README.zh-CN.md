# MCP Linker

使用轻量级 Tauri 图形界面，在 Claude Desktop、Cline、Cursor 等 AI 客户端之间同步和管理 MCP（模型上下文协议）服务器配置，并内置 MCP 服务器模板市场。

![截图](../images/sync-to-codex.webp)

💖 如果你觉得 MCP-Linker 有用，欢迎点个 ⭐ Star 鼓励我们继续开发！  
👉 [![stars](https://img.shields.io/github/stars/milisp/mcp-linker?style=social)](https://github.com/milisp/mcp-linker)

## 功能特点

- 一键安装和配置 MCP 服务器
- 支持多个 AI 客户端（Claude Desktop、Cursor、VS Code、Cline、Roo Code、Windsurf 等）
- 收录 600+ 精选 MCP 服务器
- 跨平台支持：macOS、Windows、Linux
- 自动检测 Python、Node.js、UV 环境
- 云端同步收藏的服务器
- 采用 Tauri 构建——轻量级（总大小约 6MB）、启动速度快、资源占用低且安全。

## 核心优势

**在MCP 客户端之间同步服务器配置。**  
不再需要手动复制粘贴！

## 快速开始

1. [下载最新版发布包](https://github.com/milisp/mcp-linker/releases)
2. 从列表中选择一个 MCP 服务器
3. 点击“添加”按钮自动安装和配置
4. 你的 AI 客户端就可以使用该服务器了

## 截图展示

| 管理服务器                    | 发现服务器                  | 本地同步                      |
| ----------------------------- | --------------------------- | ----------------------------- |
| ![管理](../images/manage.webp) | ![发现](../images/discover.webp) | ![本地同步](../images/sync-projects.webp) |

## 开发指南

```bash
git clone https://github.com/milisp/mcp-linker
cd mcp-linker
bun install
cp .env.example .env
bun tauri dev
```

环境要求：Node.js 20+、Bun、Rust 工具链

## 架构

- 前端：Tauri + React + shadcn/ui
- 后端：可选 FastAPI

## 贡献指南

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

## 支持与反馈

- [Discord 社区](https://discord.gg/G9uJxjpd)
- [GitHub Issues](https://github.com/milisp/mcp-linker/issues)

## 🎉 贡献者

感谢以下贡献者对本项目的改进：

- [@eltociear](https://github.com/eltociear) — 日文翻译
- [@devilcoder01](https://github.com/devilcoder01) — 提升 Windows 构建兼容性与项目搭建说明，改进 GitHub workflow、UI 和设计
