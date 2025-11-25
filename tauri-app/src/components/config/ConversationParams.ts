import { NewConversationParams } from "@/bindings/NewConversationParams";
import { AskForApproval } from "@/bindings/AskForApproval";

export type mode = "chat" | "agent" | "agent-full";
export const APPROVAL_POLICIES: AskForApproval[] = [
  "untrusted",
  "on-failure",
  "on-request",
  "never",
];

export const MODE_OPTIONS: Array<{
  value: mode;
  selectorLabel: string;
}> = [
  { value: "chat", selectorLabel: "Chat" },
  { value: "agent", selectorLabel: "Agent" },
  { value: "agent-full", selectorLabel: "Agent (Full)" },
];

export const SANDBOX_MODES: Record<
  mode,
  {
    label: string;
    defaultApprovalPolicy: AskForApproval;
  }
> = {
  chat: {
    label: "Read Only",
    defaultApprovalPolicy: "untrusted",
  },
  agent: {
    label: "Workspace Write",
    defaultApprovalPolicy: "on-request",
  },
  "agent-full": {
    label: "Full Access",
    defaultApprovalPolicy: "never",
  },
};

const defaultConfig = {
  "web_search_request": false,
  "view_image_tool": true,
  "model_reasoning_effort": "medium",
  "show_raw_agent_reasoning": true,
  "model_reasoning_summary": "auto",
};

export const getNewConversationParams = (
  provider: any,
  selectedModel: string | null,
  cwd: string | null,
  approvalPolicy: AskForApproval,
  mode: mode,
  config?: Record<string, any> | null,
): NewConversationParams => {
  const mergeConfig = config
    ? {
        ...defaultConfig,
        ...config,
      }
    : defaultConfig;
  return {
    profile: null,
    modelProvider: provider?.id ?? "openai",
    model: selectedModel,
    cwd,
    approvalPolicy: approvalPolicy,
    sandbox: mode === "chat" ? "read-only" : mode === "agent" ? "workspace-write" : "danger-full-access",
    includeApplyPatchTool: null,
    config: mergeConfig,
    baseInstructions: null,
    developerInstructions: null,
    compactPrompt: null,
  };
};
