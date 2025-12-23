// Tier levels based on plans.ts
export type ClientTier = "FREE" | "LIFETIME" | "LIFETIME_PRO" | "PRO" | "TEAM";

interface ClientInfo {
  value: string;
  label: string;
  url: string;
  desc: string;
  requiredTier: ClientTier;
}

const clients: ClientInfo[] = [
  {
    value: "claude",
    label: "Claude Desktop",
    url: "https://claude.ai/",
    desc: "Anthropic's official desktop app with native MCP support for enhanced AI capabilities",
    requiredTier: "FREE"
  },
  {
    value: "windsurf",
    label: "Windsurf",
    url: "https://codeium.com/windsurf",
    desc: "AI-native IDE by Codeium with advanced code understanding and generation",
    requiredTier: "FREE"
  },
  {
    value: "cursor",
    label: "Cursor",
    url: "https://cursor.com/",
    desc: "AI-powered code editor with built-in chat and code generation capabilities",
    requiredTier: "LIFETIME"
  },
  {
    value: "cline",
    label: "Cline (In VSCode)",
    url: "https://github.com/cline/cline",
    desc: "Autonomous coding agent that can create, edit, and execute files in VSCode",
    requiredTier: "LIFETIME"
  },
  {
    value: "roo_code",
    label: "Roo Code (In VSCode)",
    url: "https://github.com/RooVetGit/Roo-Code",
    desc: "AI coding assistant extension for VSCode with MCP protocol support",
    requiredTier: "LIFETIME"
  },
  {
    value: "vscode",
    label: "VSCode",
    url: "https://code.visualstudio.com/",
    desc: "Microsoft's popular code editor with extensive extension ecosystem including MCP support",
    requiredTier: "LIFETIME"
  },
  {
    value: "plux",
    label: "Plux",
    url: "https://github.com/milisp/plux",
    desc: "One-click add any local file to AI context with a visual file tree. Built-in notepad saves insights — no more copy-paste hassles.",
    requiredTier: "LIFETIME"
  },
  {
    value: "codex",
    label: "Codex",
    url: "https://github.com/openai/codex",
    desc: "Codex CLI is a coding agent from OpenAI that runs locally on your computer.",
    requiredTier: "LIFETIME_PRO"
  },
  {
    value: "claude_code",
    label: "Claude Code",
    url: "https://docs.anthropic.com/en/docs/claude-code",
    desc: "Anthropic's official CLI tool for Claude with MCP integration support",
    requiredTier: "LIFETIME_PRO"
  },
  {
    value: "mcphub",
    label: "mcphub.nvim",
    url: "https://github.com/robitx/mcphub.nvim",
    desc: "Neovim plugin for Model Context Protocol integration and server management",
    requiredTier: "FREE"
  },
];

export const availableClients = clients;
export const clientOptions: (ClientInfo | { value: string; label: string; requiredTier?: ClientTier })[] = [
  ...clients,
  { value: "custom", label: "Custom" },
];
