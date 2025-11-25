import { create } from "zustand";

export interface ExecCommandStatus {
  exitCode: number;
  success: boolean;
}

interface ExecCommandStore {
  statuses: Record<string, ExecCommandStatus>;
  setStatus: (callId: string, exitCode: number) => void;
  clearStatus: (callId: string) => void;
}

export const useExecCommandStore = create<ExecCommandStore>((set) => ({
  statuses: {},
  setStatus: (callId, exitCode) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [callId]: { exitCode, success: exitCode === 0 },
      },
    })),
  clearStatus: (callId) =>
    set((state) => {
      if (!state.statuses[callId]) return state;
      const { [callId]: removed, ...rest } = state.statuses;
      return { statuses: rest };
    }),
}));
