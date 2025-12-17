import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useActiveConversationStore } from "@/stores/codex/useActiveConversationStore";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";
import { invoke } from "@tauri-apps/api/core";
import { Files } from "lucide-react";
import { useCallback, useState } from "react";

interface DeleteWorktreeResult {
  removed: boolean;
  path?: string;
  reason?: string;
}

interface TurnDiffActionsProps {
  onOpenDiffPanel: () => void;
  onCloseDiffPanel: () => void;
}

export function TurnDiffActions({ onOpenDiffPanel, onCloseDiffPanel }: TurnDiffActionsProps) {
  const { activeConversationId } = useActiveConversationStore();
  const { cwd } = useCodexStore();
  const { diffsByConversationId, clearConversation, popLatestDiff } = useTurnDiffStore();
  const { toast } = useToast();
  const [isUndoingAll, setIsUndoingAll] = useState(false);
  const [isAcceptingWorktree, setIsAcceptingWorktree] = useState(false);

  const diffCount = activeConversationId
    ? diffsByConversationId[activeConversationId]?.length ?? 0
    : 0;
  const hasDiffs = diffCount > 0;

  const handleAcceptAndDeleteWorktree = useCallback(async () => {
    const conversationId = activeConversationId;
    if (!conversationId) return;
    const currentDiffCount = diffsByConversationId[conversationId]?.length ?? 0;
    if (currentDiffCount === 0) return;
    setIsAcceptingWorktree(true);
    try {
      const result = await invoke<DeleteWorktreeResult>("delete_git_worktree", {
        turnId: conversationId,
        directory: cwd,
      });
      clearConversation(conversationId);
      onCloseDiffPanel();
      const description = result?.removed
        ? result.path
          ? `Worktree removed from ${result.path}.`
          : "Worktree removed."
        : result?.reason ?? "No worktree was found for this conversation.";
      toast({
        title: result?.removed ? "Worktree deleted" : "Worktree cleanup",
        description,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to delete worktree:", message);
      toast({
        title: "Failed to accept worktree",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAcceptingWorktree(false);
    }
  }, [activeConversationId, clearConversation, cwd, diffsByConversationId, onCloseDiffPanel, toast]);

  const handleUndoAll = useCallback(async () => {
    const conversationId = activeConversationId;
    if (!conversationId) return;
    const diffs = diffsByConversationId[conversationId] ?? [];
    if (diffs.length === 0) return;
    setIsUndoingAll(true);
    try {
      for (const diff of diffs) {
        const ok = await invoke<boolean>("apply_reverse_patch", {
          unifiedDiff: diff,
          directory: cwd,
        });
        if (!ok) {
          throw new Error("Git reported no changes when reverting the patch.");
        }
        popLatestDiff(conversationId);
      }
      clearConversation(conversationId);
      onCloseDiffPanel();
      toast({
        title: "All changes reverted",
        description: "The working tree is back to its previous state.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to undo all changes:", message);
      toast({
        title: "Undo all failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUndoingAll(false);
    }
  }, [activeConversationId, clearConversation, cwd, diffsByConversationId, onCloseDiffPanel, popLatestDiff, toast]);

  if (!activeConversationId || !hasDiffs) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      <Button variant="outline" size="sm" onClick={onOpenDiffPanel}>
        <Files className="h-4 w-4" />
        File change
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAcceptAndDeleteWorktree}
        disabled={!hasDiffs || isAcceptingWorktree}
      >
        Accept and delete worktree
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUndoAll}
        disabled={!hasDiffs || isUndoingAll}
      >
        Undo all
      </Button>
    </div>
  );
}
