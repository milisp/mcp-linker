import { MsgFooter } from "@/components/chat/messages/MsgFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo, useState } from "react";
import { EventBubble } from "./EventBubble";

interface UserMessageProps {
  message: string;
  conversationId: string | null;
  canUndo: boolean;
}

export function UserMessage({ message, conversationId, canUndo }: UserMessageProps) {
  const { diffsByConversationId } = useTurnDiffStore();
  const popLatest = useTurnDiffStore((state) => state.popLatestDiff);
  const { cwd } = useCodexStore();
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<string | null>(null);

  const openUndoDialog = useCallback(() => {
    if (!conversationId || !canUndo) return;
    const list = diffsByConversationId[conversationId] || [];
    const latest = list[0];
    if (!latest) return;
    setPendingDiff(latest);
    setUndoDialogOpen(true);
  }, [conversationId, diffsByConversationId, canUndo]);

  const closeUndoDialog = useCallback(() => {
    setUndoDialogOpen(false);
    setPendingDiff(null);
  }, []);

  const confirmUndo = useCallback(async () => {
    if (!conversationId || !pendingDiff) return;
    try {
      const ok = await invoke<boolean>("apply_reverse_patch", {
        unifiedDiff: pendingDiff,
        directory: cwd,
      });
      if (ok) {
        popLatest(conversationId);
      }
    } catch (error) {
      console.error("Undo failed:", error);
    } finally {
      closeUndoDialog();
    }
  }, [conversationId, pendingDiff, cwd, popLatest, closeUndoDialog]);

  const undoSummary = useMemo(() => {
    if (!pendingDiff) return "";
    return pendingDiff
      .split("\n")
      .find((line) => line.trim().length > 0);
  }, [pendingDiff]);

  return (
    <>
      <div className="space-y-1">
        <div className="peer">
          <EventBubble align="end" variant="user">
            <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
          </EventBubble>
        </div>
        <div className="opacity-0 transition-opacity duration-200 peer-hover:opacity-100 hover:opacity-100">
          <MsgFooter
            content={message}
            align="end"
            onUndo={openUndoDialog}
            canUndo={canUndo}
          />
        </div>
      </div>
      <AlertDialog
        open={undoDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeUndoDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Confirm undo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>
                Reverting will undo the most recent change in this conversation.
                Continue?
              </p>
              {undoSummary && (
                <p className="text-xs text-muted-foreground break-all">
                  {undoSummary}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>Undo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
