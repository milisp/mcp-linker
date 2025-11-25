import { FileChange } from '@/bindings/FileChange';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useApprovalStore } from '@/stores';
import type { CodexEvent } from '@/types/chat';
import { invoke } from '@tauri-apps/api/core';
import { memo, useState } from 'react';
import { renderFileChanges } from './PatchItem';

type PatchDecision = 'approved' | 'denied' | 'abort';

export const ApplyPatchApprovalRequestItem = memo(function ApplyPatchApprovalRequestItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg } = event.payload.params;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const patchApprovalRequest = useApprovalStore((state) => {
    if (msg.type !== 'apply_patch_approval_request') {
      return null;
    }
    console.log('Looking for patch request:', msg.call_id);
    console.log('Available requests:', Object.keys(state.patchRequests));
    const entry = state.patchRequests[msg.call_id] ?? null;
    if (!entry) {
      console.log('Patch request not found in store');
      return null;
    }
    if (conversationId && entry.conversationId !== conversationId) {
      console.log('Conversation ID mismatch:', entry.conversationId, conversationId);
      return null;
    }
    console.log('Found patch request:', entry);
    return entry;
  });
  const { removePatchRequest } = useApprovalStore();

  const handlePatchDecision = async (decision: PatchDecision) => {
    if (!patchApprovalRequest || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke('respond_apply_patch_request', {
        requestToken: patchApprovalRequest.requestToken,
        decision,
      });
      removePatchRequest(patchApprovalRequest.callId);
      const decisionLabel: Record<PatchDecision, string> = {
        approved: 'approved',
        denied: 'denied',
        abort: 'aborted',
      };
      toast({
        title: 'Decision submitted',
        description: `You ${decisionLabel[decision]} the patch.`,
      });
    } catch (error) {
      console.error('Failed to send patch approval decision', error);
      const description =
        error instanceof Error ? error.message : String(error);
      toast({
        title: 'Failed to send approval',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (msg.type !== 'apply_patch_approval_request') {
    return null;
  }

  const awaitingDecision = Boolean(patchApprovalRequest);

  return (
      <div className="space-y-3 border rounded p-2">
        {msg.reason && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{msg.reason}</p>
          </div>
        )}
        {msg.grant_root && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              The agent is requesting write access to: <code className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded">{msg.grant_root}</code> for the remainder of the session.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {renderFileChanges(
            Object.fromEntries(
              Object.entries(msg.changes).filter(
                ([, fileChange]) => fileChange !== undefined,
              ) as [string, FileChange][],
            ),
          )}
        </div>
        {awaitingDecision && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() => handlePatchDecision('approved')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handlePatchDecision('denied')}
              >
                Deny
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => handlePatchDecision('abort')}
              >
                Abort turn
              </Button>
            </div>
            {isSubmitting ? (
              <div className="text-xs text-muted-foreground">
                Sending decision…
              </div>
            ) : null}
          </div>
        )}
      </div>
  );
});
