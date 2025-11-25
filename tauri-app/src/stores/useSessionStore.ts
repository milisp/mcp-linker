import { create } from "zustand";

interface ConversationBusyState {
  isBusy: boolean;
  busyStartTime: number | null;
  lastDurationMs: number | null;
}

interface SessionState {
  busyByConversationId: Record<string, ConversationBusyState>;
}

interface SessionActions {
  setConversationBusy: (conversationId: string, value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    busyByConversationId: {},
    setConversationBusy: (conversationId, value) =>
      set((state) => {
        const prev = state.busyByConversationId[conversationId];
        if (!value) {
          const duration = prev?.busyStartTime
            ? Math.max(Date.now() - prev.busyStartTime, 0)
            : prev?.lastDurationMs ?? null;
          return {
            busyByConversationId: {
              ...state.busyByConversationId,
              [conversationId]: {
                isBusy: false,
                busyStartTime: null,
                lastDurationMs: duration,
              },
            },
          };
        }

        const wasBusy = prev?.isBusy ?? false;
        const busyStartTime = wasBusy ? prev?.busyStartTime ?? null : Date.now();
        const lastDurationMs = prev?.lastDurationMs ?? null;

        return {
          busyByConversationId: {
            ...state.busyByConversationId,
            [conversationId]: {
              isBusy: true,
              busyStartTime,
              lastDurationMs,
            },
          },
        };
      }),
    reset: () => set({ busyByConversationId: {} }),
  }),
);
