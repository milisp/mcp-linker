import { memo } from "react";
import type { CodexEvent } from "@/types/chat";
import { renderFileChanges } from "./PatchItem";
import type { FileChange } from "@/bindings/FileChange";

export const PatchApplyBeginItem = memo(function PatchApplyBeginItem({
  event,
}: {
  event: CodexEvent;
}) {
  const { msg } = event.payload.params;

  if (msg.type !== "patch_apply_begin") {
    return null;
  }

  const entries = Object.entries(msg.changes ?? {});
  return (
      <div>
        {entries.length > 0 ? (
          renderFileChanges(Object.fromEntries(entries.filter(([, change]) => change !== undefined)) as { [key: string]: FileChange })
        ) : (
          <div className="text-xs text-muted-foreground">
            No file changes were included in this patch.
          </div>
        )}
      </div>
  );
});
