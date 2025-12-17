import { NewConversationParams } from "@/bindings/NewConversationParams";
import { NewConversationResponse } from "@/bindings/NewConversationResponse";
import { useActiveConversationStore, useConversationMetadataStore } from "@/stores/codex";
import { ResumeConversationResult } from "@/types/chat";
import { invoke } from "@tauri-apps/api/core";

export function useConversation() {
  const { activeConversationId, setActiveConversationId } =
    useActiveConversationStore();
  const { metadata, setMetadata } = useConversationMetadataStore();

  const createConversation = async (
    params: NewConversationParams,
  ): Promise<NewConversationResponse> => {
    console.log("NewConversationParams", params)
    setMetadata((prev) => ({ ...prev, status: "initializing", error: null }));
    try {
      const response = await invoke<NewConversationResponse>(
        "new_conversation",
        { params },
      );
      setActiveConversationId(response.conversationId);
      console.log("createConversation response", response);

      setMetadata({
        model: response.model,
        reasoningEffort: response.reasoningEffort,
        rolloutPath: response.rolloutPath,
        status: "ready",
        error: null,
      });
      return response;
    } catch (err: any) {
      console.error("new_conversation err:", err);
      setMetadata((prev) => ({
        ...prev,
        status: "error",
        error: err.toString(),
      }));
      throw err;
    }
  };

  const markConversationReady = () => {
    setMetadata({ status: "ready", error: null });
  };

  const resumeConversation = async (
    path: string,
    overrides: NewConversationParams | null,
  ): Promise<ResumeConversationResult> => {
    setMetadata((prev) => ({ ...prev, status: "initializing", error: null }));
    try {
      const response = await invoke<ResumeConversationResult>(
        "resume_conversation",
        { params: { path, overrides } },
      );
      setActiveConversationId(response.conversationId);
      setMetadata((prev) => ({
        ...prev,
        model: response.model ?? prev.model,
        status: "ready",
        error: null,
      }));
      return response;
    } catch (err: any) {
      setMetadata((prev) => ({
        ...prev,
        status: "error",
        error: err.toString(),
      }));
      throw err;
    }
  };

  const archiveConversation = async () => {
    if (!activeConversationId) return;
    try {
      await invoke("archive_conversation", {
        conversationId: activeConversationId,
        rolloutPath: metadata.rolloutPath,
      });
    } catch (err: any) {
      console.error("Failed to archive conversation:", err);
    }
  };

  return {
    conversationId: activeConversationId,
    ...metadata,
    createConversation,
    resumeConversation,
    markConversationReady,
    archiveConversation,
  };
}
