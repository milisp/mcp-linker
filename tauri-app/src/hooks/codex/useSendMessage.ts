import type { AskForApproval as V2AskForApproval } from "@/bindings/v2/AskForApproval";
import type { SandboxPolicy } from "@/bindings/v2/SandboxPolicy";
import type { TurnStartParams } from "@/bindings/v2/TurnStartParams";
import type { TurnStartResponse } from "@/bindings/v2/TurnStartResponse";
import type { UserInput } from "@/bindings/v2/UserInput";
import type { mode as ConversationMode } from "@/components/config/ConversationParams";
import { useBuildNewConversationParams } from "@/hooks/codex";
import { useProviderStore, useSandboxStore } from "@/stores";
import { useActiveConversationStore, useCodexStore, useConversationListStore, useEventStore, useSessionStore, waitForConversationListenerReady } from "@/stores/codex";
import { type MediaAttachment } from "@/types/chat";
import { buildMessageParams } from "@/utils/buildParams";
import { invoke } from "@tauri-apps/api/core";
import { useRef } from "react";
import { useConversation } from "./useConversation";

const buildUserInputs = (
  text: string,
  attachments: MediaAttachment[],
): UserInput[] => {
  const textInput: UserInput = { type: "text", text };
  const imageInputs: UserInput[] = attachments
    .filter((attachment) => attachment.type === "image")
    .map((attachment) => ({
      type: "localImage",
      path: attachment.path,
    }));

  if (imageInputs.length < attachments.length) {
    const unsupportedTypes = attachments
      .filter((attachment) => attachment.type !== "image")
      .map((attachment) => attachment.type);
    if (unsupportedTypes.length > 0) {
      console.warn(
        "[chat] Unsupported attachment types omitted: ",
        unsupportedTypes.join(", "),
      );
    }
  }

  return [textInput, ...imageInputs];
};

const buildSandboxPolicy = (
  mode: ConversationMode,
  cwd: string,
): SandboxPolicy => {
  const normalizedCwd = cwd.trim();
  switch (mode) {
    case "agent":
      return {
        type: "workspaceWrite",
        writableRoots: normalizedCwd ? [normalizedCwd] : [],
        networkAccess: true,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      };
    case "agent-full":
      return { type: "dangerFullAccess" };
    case "chat":
    default:
      return { type: "readOnly" };
  }
};

const normalizeApprovalPolicy = (policy: string): V2AskForApproval => {
  switch (policy) {
    case "untrusted":
    case "on-failure":
    case "on-request":
    case "never":
      return policy as V2AskForApproval;
    default:
      return "on-request";
  }
};

export function useSendMessage() {
  const activeConversationId = useActiveConversationStore(
    (state) => state.activeConversationId,
  );
  const setConversationBusy = useSessionStore(
    (state) => state.setConversationBusy,
  );
  const isBusy = useSessionStore((state) => {
    if (!activeConversationId) {
      return false;
    }
    return state.busyByConversationId[activeConversationId]?.isBusy ?? false;
  });
  const buildNewConversationParams = useBuildNewConversationParams();
  const { cwd } = useCodexStore();
  const { clearEvents } = useEventStore();
  const { createConversation, markConversationReady } = useConversation();
  const { setActiveConversationId, addActiveConversationId } =
    useActiveConversationStore();
  const { selectedProviderId, selectedModel, reasoningEffort } =
    useProviderStore();
  const { mode, approvalPolicy } = useSandboxStore();
  const lastTurnStartConfig = useRef<{
    conversationId: string | null;
    providerId: string | null;
    model: string | null;
    effort: string | null;
  } | null>(null);

  const sendMessage = async (
    conversationId: string,
    text: string,
    attachments: MediaAttachment[],
  ) => {
    setConversationBusy(conversationId, true);
    try {
      const shouldStartTurn =
        lastTurnStartConfig.current?.conversationId !== conversationId ||
        lastTurnStartConfig.current?.providerId !== selectedProviderId ||
        lastTurnStartConfig.current?.model !== selectedModel ||
        lastTurnStartConfig.current?.effort !== reasoningEffort;

      if (shouldStartTurn) {
        const normalizedCwd = cwd.trim();
        const normalizedApprovalPolicy = normalizeApprovalPolicy(approvalPolicy);
        const turnStartParams: TurnStartParams = {
          threadId: conversationId,
          input: buildUserInputs(text, attachments),
          cwd: normalizedCwd || null,
          approvalPolicy: normalizedApprovalPolicy,
          sandboxPolicy: buildSandboxPolicy(mode, normalizedCwd),
          model: selectedModel ?? null,
          effort: reasoningEffort,
          summary: null,
        };
        await invoke<TurnStartResponse>("turn_start", {
          params: turnStartParams,
        });
        lastTurnStartConfig.current = {
          conversationId,
          providerId: selectedProviderId,
          model: selectedModel,
          effort: reasoningEffort,
        };
      }

      const params = buildMessageParams(conversationId, text, attachments);
      await invoke("send_user_message", {
        params: {
          conversationId,
          items: params.items,
        },
      });
      markConversationReady();
    } catch (error) {
      setConversationBusy(conversationId, false);
      throw error;
    }
  };

  const interrupt = async (conversationId: string) => {
    await invoke("interrupt_conversation", {
      params: { conversationId },
    });
  };

  const handleSendMessage = async (
    text: string,
    attachments: MediaAttachment[],
  ) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    let currentConversationId =
      useActiveConversationStore.getState().activeConversationId;
    if (!currentConversationId) {
      currentConversationId = await handleCreateConversation(trimmedText);
    }

    if (!currentConversationId) {
      return;
    }

    const attachmentsToSend = attachments.map((attachment) => ({
      ...attachment,
    }));

    void sendMessage(currentConversationId, trimmedText, attachmentsToSend).catch(
      (error) => {
        console.error("Failed to send message:", error);
      },
    );
  };

  const handleCreateConversation = async (
    preview = "New Chat",
  ): Promise<string> => {
    const newConversation = await createConversation(
      buildNewConversationParams,
    );
    await useConversationListStore.getState().addConversation(cwd, {
      conversationId: newConversation.conversationId,
      preview,
      timestamp: new Date().toISOString(),
      path: newConversation.rolloutPath,
      modelProvider: selectedProviderId ?? "",
      cwd,
      cliVersion: "",
      source: "cli",
      gitInfo: null,
    });
    setActiveConversationId(newConversation.conversationId);
    addActiveConversationId(newConversation.conversationId);
    clearEvents(newConversation.conversationId);
    await waitForConversationListenerReady(newConversation.conversationId);
    return newConversation.conversationId;
  };

  return {
    sendMessage,
    interrupt,
    isBusy,
    handleCreateConversation,
    handleSendMessage,
  };
}
