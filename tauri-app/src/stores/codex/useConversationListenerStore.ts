import { create } from "zustand";

interface ConversationListenerState {
  listenerReadyConversationId: string | null;
  setListenerReadyConversationId: (conversationId: string | null) => void;
}

export const useConversationListenerStore = create<ConversationListenerState>((set) => ({
  listenerReadyConversationId: null,
  setListenerReadyConversationId: (conversationId) =>
    set({ listenerReadyConversationId: conversationId }),
}));

const LISTENER_WAIT_TIMEOUT_MS = 2000;

export const waitForConversationListenerReady = async (
  conversationId: string,
) => {
  if (!conversationId) {
    return;
  }

  const store = useConversationListenerStore;
  if (store.getState().listenerReadyConversationId === conversationId) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    let unsubscribe: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (unsubscribe) {
        unsubscribe();
      }
      if (timer !== null) {
        clearTimeout(timer);
      }
      resolve();
    };

    unsubscribe = store.subscribe((state) => {
      if (state.listenerReadyConversationId === conversationId) {
        finish();
      }
    });

    timer = setTimeout(() => {
      console.warn(
        `[conversation listener] timed out waiting for listener on ${conversationId}`,
      );
      finish();
    }, LISTENER_WAIT_TIMEOUT_MS);
  });
};
