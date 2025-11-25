import { CodexEvent } from "@/types/chat";
import { invoke } from "@tauri-apps/api/core";
import type { MutableRefObject } from "react";

/**
 * Handle logic for a task_complete event.
 *
 * - If the current turn recorded any patch activity, commit changes to the
 *   conversation-specific worktree with a concise message.
 * - This function intentionally does not call any external onTaskComplete
 *   handler to preserve the original call order (the caller should invoke it).
 */
export async function handleTaskComplete(params: {
  event: CodexEvent;
  worktreeId: string;
  turnKey: string;
  cwd: string;
  patchRecordedTurnsRef: MutableRefObject<Set<string>>;
}): Promise<void> {
  const { event, worktreeId, turnKey, cwd, patchRecordedTurnsRef } = params;
  try {
    if (!patchRecordedTurnsRef.current.has(turnKey)) return;

    const { msg } = event.payload.params as any;
    const lastAgentMsg: string | null = (msg as any)?.last_agent_message ?? null;
    const firstLine = lastAgentMsg?.split("\n")[0]?.trim() || "Task complete";
    const commitMessage = `[codexia] ${firstLine} (conversation ${event.payload.params.conversationId} turn ${event.payload.params.id})`;

    const result = await invoke<{
      prepared: boolean;
      path?: string;
      reason?: string;
    }>("commit_changes_to_worktree", {
      turnId: worktreeId,
      message: commitMessage,
      directory: cwd,
    });

    if (result?.prepared) {
      console.debug("Committed to worktree for", worktreeId, result.path, result.reason ?? "");
    } else {
      console.debug("Skipped committing to worktree for", worktreeId, result?.reason);
    }

    // Clear the flag for this turn
    patchRecordedTurnsRef.current.delete(turnKey);
  } catch (e) {
    console.warn("Failed to prepare worktree on task_complete:", e);
  }
}
