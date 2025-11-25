import { create } from "zustand";
import type { FileChange } from "@/bindings/FileChange";
import { ParsedCommand } from "@/bindings/ParsedCommand";

export type ExecApprovalRequest = {
  requestToken: string;
  conversationId: string;
  callId: string;
  command: string[];
  cwd: string;
  parsedCmd: Array<ParsedCommand>;
  reason: string | null;
};

export type PatchApprovalRequest = {
  requestToken: string;
  conversationId: string;
  callId: string;
  reason: string | null;
  grantRoot: string | null;
  changes: Record<string, FileChange>;
};

interface ApprovalState {
  execRequests: Record<string, ExecApprovalRequest>;
  patchRequests: Record<string, PatchApprovalRequest>;
  upsertExecRequest: (request: ExecApprovalRequest) => void;
  removeExecRequest: (callId: string) => void;
  upsertPatchRequest: (request: PatchApprovalRequest) => void;
  removePatchRequest: (callId: string) => void;
  clearAll: () => void;
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  execRequests: {},
  patchRequests: {},
  upsertExecRequest: (request) =>
    set((state) => ({
      execRequests: {
        ...state.execRequests,
        [request.callId]: request,
      },
    })),
  removeExecRequest: (callId) =>
    set((state) => {
      if (!state.execRequests[callId]) {
        return state;
      }
      const { [callId]: _removed, ...rest } = state.execRequests;
      return {
        execRequests: rest,
      };
    }),
  upsertPatchRequest: (request) =>
    set((state) => ({
      patchRequests: {
        ...state.patchRequests,
        [request.callId]: request,
      },
    })),
  removePatchRequest: (callId) =>
    set((state) => {
      if (!state.patchRequests[callId]) {
        return state;
      }
      const { [callId]: _removed, ...rest } = state.patchRequests;
      return {
        patchRequests: rest,
      };
    }),
  clearAll: () => set({ execRequests: {}, patchRequests: {} }),
}));
