import type { ConversationSummary } from "@/bindings/ConversationSummary";
import { invoke } from "@tauri-apps/api/core";

export interface RenameConversationParams {
  conversationId: string;
  nextPreview: string;
  cwd: string | null | undefined;
  conversations: ConversationSummary[];
  updateConversationPreview: (conversationId: string, preview: string) => void;
}

export async function renameConversation({
  conversationId,
  nextPreview,
  cwd,
  conversations,
  updateConversationPreview,
}: RenameConversationParams): Promise<boolean> {
  const trimmedPreview = nextPreview.trim();

  if (!cwd || !trimmedPreview) {
    return false;
  }

  const conversation = conversations.find(
    (item) => item.conversationId === conversationId,
  );

  if (!conversation || !conversation.path) {
    return false;
  }

  if (nextPreview === conversation.preview) {
    return true;
  }

  updateConversationPreview(conversationId, nextPreview);

  try {
    await invoke("update_cache_title", {
      projectPath: cwd,
      sessionPath: conversation.path,
      preview: nextPreview,
    });

    return true;
  } catch (error) {
    console.error("Failed to update conversation title", error);
    updateConversationPreview(conversationId, conversation.preview ?? "");
    return false;
  }
}
