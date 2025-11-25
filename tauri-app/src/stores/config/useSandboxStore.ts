import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AskForApproval } from "@/bindings/AskForApproval";
import { mode, SANDBOX_MODES } from "@/components/config/ConversationParams";

interface SandboxState {
  mode: mode;
  approvalPolicy: AskForApproval;
  setMode: (mode: mode) => void;
  setApprovalPolicy: (policy: AskForApproval) => void;
}

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set) => ({
      mode: "chat", // Default mode
      approvalPolicy: SANDBOX_MODES.chat.defaultApprovalPolicy, // Default approval policy
      setMode: (mode) =>
        set(() => ({
          mode,
          approvalPolicy: SANDBOX_MODES[mode].defaultApprovalPolicy, // Update approval policy based on new mode
        })),
      setApprovalPolicy: (approvalPolicy) => set({ approvalPolicy }),
    }),
    {
      name: "sandbox-storage",
    },
  ),
);
