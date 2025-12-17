import { ConversationId } from "@/bindings/ConversationId";
import { useCodexStore, useConversationListenerStore, useSessionStore } from "@/stores/codex";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { CodexEvent } from "@/types/chat";
import { useBackendErrorListener } from "@/utils/backendErrorListener";
import { playBeep } from "@/utils/beep";
import { handleTaskComplete } from "@/utils/handleTaskComplete";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useSystemSleepPrevention } from "../useSystemSleepPrevention";

interface EventHandlers {
  isConversationReady?: boolean;
  onAnyEvent?: (event: CodexEvent) => void;
  onTaskStarted?: (event: CodexEvent) => void;
  onTaskComplete?: (event: CodexEvent) => void;
  onAgentMessage?: (event: CodexEvent) => void;
  onAgentMessageDelta?: (event: CodexEvent) => void;
  onUserMessage?: (event: CodexEvent) => void;
  onAgentReasoning?: (event: CodexEvent) => void;
  onAgentReasoningDelta?: (event: CodexEvent) => void;
  onAgentReasoningSectionBreak?: (event: CodexEvent) => void;
  onExecApprovalRequest?: (event: CodexEvent) => void;
  onApplyPatchApprovalRequest?: (event: CodexEvent) => void;
  onExecCommandBegin?: (event: CodexEvent) => void;
  onExecCommandEnd?: (event: CodexEvent) => void;
  onPatchApplyBegin?: (event: CodexEvent) => void;
  onPatchApplyEnd?: (event: CodexEvent) => void;
  onWebSearchBegin?: (event: CodexEvent) => void;
  onWebSearchEnd?: (event: CodexEvent) => void;
  onMcpToolCallBegin?: (event: CodexEvent) => void;
  onMcpToolCallEnd?: (event: CodexEvent) => void;
  onTurnDiff?: (event: CodexEvent) => void;
  onTokenCount?: (event: CodexEvent) => void;
  onStreamError?: (event: CodexEvent) => void;
  onError?: (event: CodexEvent) => void;
}

// Busy state event types
const BUSY_OFF_EVENTS = new Set(["error", "task_complete", "turn_aborted"]);
const BUSY_ON_EVENTS = new Set(["task_started"]);

export function useConversationEvents(
  conversationId: ConversationId | null,
  { isConversationReady = false, ...handlers }: EventHandlers,
) {
  const handlersRef = useRef<EventHandlers>(handlers);
  const setConversationBusy = useSessionStore(
    (state) => state.setConversationBusy,
  );
  const latestEvent = useRef<CodexEvent | null>(null);
  const patchRecordedTurnsRef = useRef<Set<string>>(new Set());
  const subscribedConversationsRef = useRef<Set<string>>(new Set());
  const { cwd } = useCodexStore();
  const cwdRef = useRef(cwd);
  const {
    autoCommitGitWorktree,
    enableTaskCompleteBeep,
    preventSleepDuringTasks,
  } = useSettingsStore();
  const autoCommitGitWorktreeRef = useRef(autoCommitGitWorktree);
  const enableTaskCompleteBeepRef = useRef(enableTaskCompleteBeep);

  useSystemSleepPrevention(
    conversationId,
    latestEvent.current,
    preventSleepDuringTasks,
  );
  useBackendErrorListener();

  const listenerRegisteredRef = useRef(false);
  const listenerUnregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);

  useEffect(() => {
    autoCommitGitWorktreeRef.current = autoCommitGitWorktree;
  }, [autoCommitGitWorktree]);

  useEffect(() => {
    enableTaskCompleteBeepRef.current = enableTaskCompleteBeep;
  }, [enableTaskCompleteBeep]);

  useEffect(() => {
    if (listenerRegisteredRef.current) {
      return;
    }
    let conversationUnlisten: (() => void) | null = null;
    let disposed = false;

    (async () => {
      try {
        conversationUnlisten = await listen(
          "codex:event",
          async (event: CodexEvent) => {
            const currentHandlers = handlersRef.current;
            const { params } = event.payload;
            const { msg } = params;

            const worktreeId = params.conversationId;
            const turnKey = `${params.conversationId}:${params.id}`;

            if (!msg.type.endsWith("_delta")) {
              console.log(msg.type, msg);
            }

            latestEvent.current = event;
            currentHandlers.onAnyEvent?.(event);

            // Handle busy state
            if (worktreeId) {
              if (
                msg.type === "exec_approval_request" ||
                msg.type === "apply_patch_approval_request"
              ) {
                setConversationBusy(worktreeId, false);
              } else if (BUSY_OFF_EVENTS.has(msg.type)) {
                if (enableTaskCompleteBeepRef.current) {
                  playBeep();
                }
                setConversationBusy(worktreeId, false);
              } else if (BUSY_ON_EVENTS.has(msg.type)) {
                setConversationBusy(worktreeId, true);
              }
            }

            // Dispatch to specific handlers
            switch (msg.type) {
              case "task_started":
                currentHandlers.onTaskStarted?.(event);
                break;

              case "task_complete":
                if (autoCommitGitWorktreeRef.current) {
                  void handleTaskComplete({
                    event,
                    worktreeId,
                    turnKey,
                    cwd: cwdRef.current,
                    patchRecordedTurnsRef,
                  });
                }
                currentHandlers.onTaskComplete?.(event);
                break;

              case "user_message":
                currentHandlers.onUserMessage?.(event);
                break;

              case "agent_message":
                currentHandlers.onAgentMessage?.(event);
                break;

              case "agent_reasoning_section_break":
                currentHandlers.onAgentReasoningSectionBreak?.(event);
                break;

              case "exec_approval_request":
                currentHandlers.onExecApprovalRequest?.(event);
                break;

              case "apply_patch_approval_request":
                patchRecordedTurnsRef.current.add(turnKey);
                currentHandlers.onApplyPatchApprovalRequest?.(event);
                break;

              case "exec_command_begin":
                currentHandlers.onExecCommandBegin?.(event);
                break;

              case "exec_command_end":
                currentHandlers.onExecCommandEnd?.(event);
                break;

              case "patch_apply_begin":
                patchRecordedTurnsRef.current.add(turnKey);
                currentHandlers.onPatchApplyBegin?.(event);
                break;

              case "patch_apply_end":
                currentHandlers.onPatchApplyEnd?.(event);
                break;

              case "web_search_begin":
                currentHandlers.onWebSearchBegin?.(event);
                break;

              case "web_search_end":
                currentHandlers.onWebSearchEnd?.(event);
                break;

              case "mcp_tool_call_begin":
                currentHandlers.onMcpToolCallBegin?.(event);
                break;

              case "mcp_tool_call_end":
                currentHandlers.onMcpToolCallEnd?.(event);
                break;

              case "turn_diff":
                currentHandlers.onTurnDiff?.(event);
                break;

              case "token_count":
                currentHandlers.onTokenCount?.(event);
                break;

              case "stream_error":
                console.log("stream_error:", event);
                currentHandlers.onStreamError?.(event);
                break;

              case "error":
                console.log("error:", event);
                currentHandlers.onError?.(event);
                break;

              // Ignored events
              case "agent_message_content_delta":
              case "agent_message_delta":
              case "agent_reasoning":
              case "agent_reasoning_delta":
              case "agent_reasoning_raw_content_delta":
              case "reasoning_content_delta":
              case "reasoning_raw_content_delta":
              case "plan_update":
              case "item_started":
              case "item_completed":
              case "agent_reasoning_raw_content":
              case "exec_command_output_delta":
              case "mcp_startup_complete":
              case "turn_aborted":
                break;

              default:
                console.warn(`Unknown event type: ${msg.type}`, event);
            }
          },
        );

        if (disposed && conversationUnlisten) {
          conversationUnlisten();
          conversationUnlisten = null;
          return;
        }

        listenerRegisteredRef.current = true;
        listenerUnregisterRef.current = conversationUnlisten;
      } catch (err) {
        console.error("Failed to listen for codex events:", err);
      }
    })();

    return () => {
      disposed = true;
      if (conversationUnlisten) {
        conversationUnlisten();
        conversationUnlisten = null;
      }
      listenerRegisteredRef.current = false;
      listenerUnregisterRef.current = null;
    };
  }, [setConversationBusy]);

  useEffect(() => {
    if (!conversationId || !isConversationReady) {
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        if (!subscribedConversationsRef.current.has(conversationId)) {
          await invoke("add_conversation_listener", {
            params: { conversationId },
          });
          if (isCancelled) {
            return;
          }
          subscribedConversationsRef.current.add(conversationId);
        }

        if (isCancelled) {
          return;
        }

        useConversationListenerStore
          .getState()
          .setListenerReadyConversationId(conversationId);
      } catch (err) {
        console.error("Failed to add conversation listener:", err);
      }
    })();

    return () => {
      isCancelled = true;
      if (
        useConversationListenerStore.getState().listenerReadyConversationId ===
        conversationId
      ) {
        useConversationListenerStore
          .getState()
          .setListenerReadyConversationId(null);
      }
      if (conversationId) {
        setConversationBusy(conversationId, false);
      }
    };
  }, [conversationId, isConversationReady, setConversationBusy]);
}
