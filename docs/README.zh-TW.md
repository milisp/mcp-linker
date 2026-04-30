# MCP Linker

<div align="center">

新增、管理並同步 MCP（Model Context Protocol）伺服器設定至 Claude Desktop、Cursor、Cline 等 AI 客戶端，透過輕量級的 Tauri 圖形介面，內建 MCP 伺服器市集。

![MCP Linker Logo](../images/logo.png)

⚡️ **告別繁瑣的手動操作！**

[![GitHub stars](https://img.shields.io/github/stars/milisp/mcp-linker?style=for-the-badge&logo=github&color=yellow)](https://github.com/milisp/mcp-linker/stargazers)
[![GitHub release](https://img.shields.io/github/release/milisp/mcp-linker.svg?style=for-the-badge&logo=github)](https://github.com/milisp/mcp-linker/releases)
[![Downloads](https://img.shields.io/github/downloads/milisp/mcp-linker/total.svg?style=for-the-badge&logo=github)](https://github.com/milisp/mcp-linker/releases)

### 🌟 **喜歡這個專案嗎？請給我們一顆星！** 🌟

---

### 🚀 30 秒快速開始

[📥 **立即下載**](https://github.com/milisp/mcp-linker/releases) • [🚀 快速上手](#快速上手) • [💬 加入 Discord](https://discord.gg/UqXeVqUKQq)

</div>

---

## ✨ 為什麼選擇 MCP Linker？

**加速你的 AI 工具工作流程的最快方式**

![Demo](../images/demo.gif)

### 🎯 核心功能

- **🚀 一鍵安裝** — 無需手動編輯設定檔
- **🔄 多客戶端支援** — 支援 Claude Desktop、Cursor、VS Code、Cline、Roo Code、Windsurf 等
- **📦 600+ 精選伺服器** — 內建 MCP 伺服器市集
- **🌐 跨平台支援** — macOS、Windows、Linux（僅約 6MB）
- **🔍 智慧偵測** — 自動偵測 Python、Node.js、UV 環境
- **⚡ 基於 Tauri 构建** — 快速、安全、資源效率高

### 💎 實用優勢

- 同步所有 MCP 客戶端的伺服器設定
- Pro 用戶享有 🔐 雲端加密同步功能
- 團隊協作功能即將推出！

## 🚀 快速上手

**只需幾步，即可完成設定：**

1. **[📥 下載最新版本](https://github.com/milisp/mcp-linker/releases)**
2. **🔍 瀏覽** 精選 MCP 伺服器市集
3. **➕ 點擊「新增」** 即可自動安裝與設定
4. **🎉 完成！**

> **💡 小提醒：** 記得 star 本專案，以追蹤最新 MCP 伺服器與新功能！

## 🚀 升級至 MCP-Linker Pro 或 Team 方案

享受雲端同步等高級功能  
👉 [查看方案與訂閱](https://mcp-linker.milisp.dev/pricing)

## 📸 畫面截圖

| 管理介面                        | 🔍 探索伺服器                   | ⚙️ 新增伺服器                       |
| ------------------------------- | ------------------------------- | ------------------------------- |
| ![Manage](../images/manage.png) | ![Discover](../images/discover.png) | ![Add Server](../images/add-server.png) |

---

## 🛠️ 開發環境

```bash
git clone https://github.com/milisp/mcp-linker
cd mcp-linker
bun install
cp .env.example .env
bun tauri dev
```

**需求：** Node.js 20+、Bun、Rust toolchain

---

## 🏗️ 架構說明

- **前端：** Tauri + React + shadcn/ui
- **後端：** 可選擇使用 FastAPI

---

## 🤝 參與貢獻

我們歡迎所有貢獻者！詳情請參閱 [CONTRIBUTING.md](./CONTRIBUTING.md)

**這個專案對你有幫助嗎？請幫我們加個星！⭐**

---

## 💬 支援與社群

- **[💬 加入 Discord 社群](https://discord.gg/UqXeVqUKQq)** — 提問、交流、分享想法
- **[🐛 回報問題](https://github.com/milisp/mcp-linker/issues)** — 幫助我們改進！

---

## 🎉 感謝貢獻者

感謝所有熱情的社群貢獻者讓 MCP Linker 不斷進步：

[![Contributors](https://contrib.rocks/image?repo=milisp/mcp-linker)](https://github.com/milisp/mcp-linker/graphs/contributors)

**特別感謝：**

- [@eltociear](https://github.com/eltociear) — 日文翻譯
- [@devilcoder01](https://github.com/devilcoder01) — Windows 相容性、介面改進、GitHub 自動化流程 🛠️
