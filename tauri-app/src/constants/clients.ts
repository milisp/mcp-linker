const clients = [
  { 
    value: "claude", 
    label: "Claude Desktop", 
    url: "https://claude.ai/", 
    desc: "Anthropic's official desktop app with native MCP support for enhanced AI capabilities" 
  },
  { 
    value: "cursor", 
    label: "Cursor", 
    url: "https://cursor.com/", 
    desc: "AI-powered code editor with built-in chat and code generation capabilities" 
  },
  { 
    value: "claude_code", 
    label: "Claude Code", 
    url: "https://docs.anthropic.com/en/docs/claude-code", 
    desc: "Anthropic's official CLI tool for Claude with MCP integration support" 
  },
  { 
    value: "plux", 
    label: "Plux", 
    url: "https://github.com/milisp/plux", 
    desc: "One-click add any local file to AI context with a visual file tree. Built-in notepad saves insights — no more copy-paste hassles.",
  },
  { 
    value: "cline", 
    label: "Cline (In VSCode)", 
    url: "https://github.com/cline/cline", 
    desc: "Autonomous coding agent that can create, edit, and execute files in VSCode" 
  },
  { 
    value: "roo_code", 
    label: "Roo Code (In VSCode)", 
    url: "https://github.com/RooVetGit/Roo-Code", 
    desc: "AI coding assistant extension for VSCode with MCP protocol support" 
  },
  { 
    value: "vscode", 
    label: "VSCode", 
    url: "https://code.visualstudio.com/", 
    desc: "Microsoft's popular code editor with extensive extension ecosystem including MCP support" 
  },
  { 
    value: "windsurf", 
    label: "Windsurf", 
    url: "https://codeium.com/windsurf", 
    desc: "AI-native IDE by Codeium with advanced code understanding and generation" 
  },
  { 
    value: "mcphub", 
    label: "mcphub.nvim", 
    url: "https://github.com/robitx/mcphub.nvim", 
    desc: "Neovim plugin for Model Context Protocol integration and server management" 
  },
  { 
    value: "codex", 
    label: "Codex", 
    url: "https://github.com/openai/codex", 
    desc: "Codex CLI is a coding agent from OpenAI that runs locally on your computer." 
  },
];

export const availableClients = clients;
export const clientOptions = [
  ...clients,
  { value: "custom", label: "Custom" },
];
