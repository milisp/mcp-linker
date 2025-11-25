import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TurnDiffView } from "./TurnDiffView";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";

interface TurnDiffPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
}

export function TurnDiffPanel({ open, onOpenChange, conversationId }: TurnDiffPanelProps) {
  const diffsByConversationId = useTurnDiffStore((s) => s.diffsByConversationId);

  const diffs = useMemo(() => {
    if (!conversationId) return [] as string[];
    return diffsByConversationId[conversationId] || [];
  }, [conversationId, diffsByConversationId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>File changes</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4 pt-0 overflow-y-auto h-full">
          {diffs.length === 0 ? (
            <div className="text-muted-foreground text-sm">No file changes in this conversation yet.</div>
          ) : (
            diffs.map((unifiedDiff, idx) => (
              <TurnDiffView key={idx} content={unifiedDiff} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


