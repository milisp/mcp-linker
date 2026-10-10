interface ClientInfo {
  value: string;
  label: string;
  url: string;
  desc: string;
}

const clients: ClientInfo[] = [
  {
    value: "claude_code",
    label: "Claude Code",
    url: "https://docs.anthropic.com/en/docs/claude-code",
    desc: "Anthropic's official CLI tool for Claude with MCP integration support"
  },
  {
    value: "codex",
    label: "Codex",
    url: "https://github.com/openai/codex",
    desc: "Codex CLI is a coding agent from OpenAI that runs locally on your computer."
  },
  {
    value: "cursor",
    label: "Cursor",
    url: "https://cursor.com/",
    desc: "AI-powered code editor with built-in chat and code generation capabilities"
  },
  {
    value: "cline",
    label: "Cline (In VSCode)",
    url: "https://github.com/cline/cline",
    desc: "Autonomous coding agent that can create, edit, and execute files in VSCode"
  },
  {
    value: "copilot",
    label: "Github Copilot",
    url: "https://code.visualstudio.com/",
    desc: "Microsoft's popular code editor with extensive extension ecosystem including MCP support"
  },
  {
    value: "mcphub",
    label: "mcphub.nvim",
    url: "https://github.com/robitx/mcphub.nvim",
    desc: "Neovim plugin for Model Context Protocol integration and server management"
  },
  {
    value: "claude",
    label: "Claude Desktop",
    url: "https://claude.ai/",
    desc: "Anthropic's official desktop app with native MCP support for enhanced AI capabilities"
  },
];

export const availableClients = clients;
export const clientOptions: (ClientInfo | { value: string; label: string })[] = [
  ...clients,
  { value: "custom", label: "Custom" },
];
