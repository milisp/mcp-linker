import { Button } from "@/components/ui/button";
import { useViewStore } from "@/stores/viewStore";
import type { ServerType } from "@/types";
import { Check, Cloud, Loader2, Monitor, Server } from "lucide-react";
import { useRef, useState } from "react";
import { quickInstallConfig, serverTransportLabels } from "../utils/quickInstall";

interface ServerCardProps {
  server: ServerType;
  onOpenDialog: (server: ServerType) => void;
  onQuickAdd: (server: ServerType) => Promise<boolean>;
  targetLabel: string;
  targetKey: string;
}

export function ServerCard({ server, onOpenDialog, onQuickAdd, targetLabel, targetKey }: ServerCardProps) {
  const navigate = useViewStore(state => state.navigate);
  const [isAdding, setIsAdding] = useState(false);
  const [addedTarget, setAddedTarget] = useState<string | null>(null);
  const addingRef = useRef(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const canQuickAdd = quickInstallConfig(server) !== null;
  const isAdded = addedTarget === targetKey;
  const labels = serverTransportLabels(server);

  const handleAdd = async () => {
    if (addingRef.current) return;
    if (!canQuickAdd) {
      onOpenDialog(server);
      return;
    }
    addingRef.current = true;
    setIsAdding(true);
    try {
      if (await onQuickAdd(server)) setAddedTarget(targetKey);
    } finally {
      addingRef.current = false;
      setIsAdding(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-muted/30">
      <button
        type="button"
        onClick={() => navigate(`/servers/${encodeURIComponent(server.id)}`)}
        aria-label={`View details for ${server.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {server.logoUrl && failedLogo !== server.logoUrl ? (
            <img src={server.logoUrl} alt="" loading="lazy" className="size-7 rounded object-contain" onError={() => setFailedLogo(server.logoUrl!)} />
          ) : <Server className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 max-w-full truncate text-sm font-semibold" title={server.name}>{server.name}</span>
            {labels.map(label => (
              <span key={label} className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${label === "Remote" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}>
                {label === "Remote" ? <Cloud className="size-3" /> : label === "Local" ? <Monitor className="size-3" /> : null}
                {label}
              </span>
            ))}
          </span>
          <span className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={server.description}>{server.description}</span>
        </span>
      </button>
      <Button
        type="button"
        size="sm"
        variant={isAdded ? "outline" : "default"}
        className="h-8 min-w-16 shrink-0 px-2.5 text-xs"
        onClick={handleAdd}
        disabled={isAdding || isAdded}
        title={canQuickAdd ? `Add ${server.name} to ${targetLabel}` : `Configure ${server.name} before adding to ${targetLabel}`}
        aria-label={isAdding ? `Adding ${server.name}` : isAdded ? `${server.name} added to ${targetLabel}` : canQuickAdd ? `Add ${server.name} to ${targetLabel}` : `Configure ${server.name}`}
      >
        {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : isAdded ? <Check className="size-3.5" /> : null}
        {isAdding ? "Adding" : isAdded ? "Added" : canQuickAdd ? "Add" : "Configure"}
      </Button>
    </div>
  );
}
