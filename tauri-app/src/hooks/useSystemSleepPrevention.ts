import { ConversationId } from "@/bindings/ConversationId";
import { CodexEvent } from "@/types/chat";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

export function useSystemSleepPrevention(
  conversationId: ConversationId | null,
  event: CodexEvent | null,
  enabled = true,
) {
  const allowSleep = (
    id: ConversationId | null,
  ) => {
    if (id) {
      return invoke("allow_sleep", { conversationId: id });
    }
    return invoke("allow_sleep");
  };

  useEffect(() => {
    if (!enabled || !conversationId || !event) return;

    const { msg } = event.payload.params;
    const conversationIdForSleep = event.payload.params.conversationId;

    if (msg.type === "task_started") {
      invoke("prevent_sleep", {
        conversationId: conversationIdForSleep,
      })
        .catch((error) => {
          console.error("Failed to prevent system sleep:", error);
        })
        .finally(() => {
          console.log(`task_started prevent_sleep`, conversationIdForSleep);
        });
    } else if (
      msg.type === "task_complete" ||
      msg.type === "error" ||
      msg.type === "turn_aborted"
    ) {
      allowSleep(conversationIdForSleep)
        .catch((error) => {
          console.error("Failed to restore system sleep:", error);
        })
        .finally(() => {
          console.log("allow_sleep", conversationIdForSleep);
        });
    }
  }, [conversationId, event, enabled]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    allowSleep(conversationId)
      .catch((error) => {
        console.error("Failed to restore system sleep:", error);
      })
      .finally(() => {
        console.log("allow_sleep", conversationId);
      });
  }, [conversationId, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return () => {
      allowSleep(conversationId)
        .catch((error) => {
          console.error("Failed to restore system sleep during cleanup:", error);
        })
        .finally(() => {
          console.log("allow_sleep", conversationId);
        });
    };
  }, [conversationId, enabled]);
}
