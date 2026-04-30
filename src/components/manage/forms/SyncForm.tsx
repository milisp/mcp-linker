import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { availableClients } from "@/constants/clients";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface SyncFormProps {
  currentClient?: string;
  isSyncing: boolean;
  onSync: (
    fromClient: string,
    toClient: string,
    overrideAll: boolean,
  ) => Promise<void>;
  onCancel: () => void;
}

export function SyncForm({
  currentClient,
  isSyncing,
  onSync,
  onCancel,
}: SyncFormProps) {
  const [syncFromClient, setSyncFromClient] = useState<string>("");
  const [syncToClient, setSyncToClient] = useState<string>(currentClient || "");
  const [overrideMode, setOverrideMode] = useState(false);

  // Reset state when currentClient changes (e.g., dialog opens/closes with a new client)
  useEffect(() => {
    setSyncToClient(currentClient || "");
    setSyncFromClient("");
    setOverrideMode(false);
  }, [currentClient]);

  const handleSync = async () => {
    if (syncFromClient && syncToClient) {
      await onSync(syncFromClient, syncToClient, overrideMode);
    }
  };

  return (
    <div className="space-y-4 bg-background text-foreground">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          From Client:
        </label>
        <Select
          value={syncFromClient}
          onValueChange={setSyncFromClient}
          disabled={isSyncing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source client" />
          </SelectTrigger>
          <SelectContent>
            {availableClients
              .filter((client) => client.value !== currentClient)
              .map((client) => (
                <SelectItem key={client.value} value={client.value}>
                  {client.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          To Client:
        </label>
        <Select
          value={syncToClient}
          onValueChange={setSyncToClient}
          disabled={isSyncing || syncFromClient === syncToClient}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select target client" />
          </SelectTrigger>
          <SelectContent>
            {availableClients.map((client) => (
              <SelectItem key={client.value} value={client.value}>
                {client.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="override-mode"
          checked={overrideMode}
          onCheckedChange={setOverrideMode}
          disabled={isSyncing}
        />
        <label
          htmlFor="override-mode"
          className="text-sm font-medium text-foreground"
        >
          Override all (replace existing configs)
        </label>
      </div>

      <div className="text-xs text-muted-foreground">
        {overrideMode
          ? "This will completely replace all MCP server configurations in the target client."
          : "This will merge configurations, keeping existing ones and adding new ones from source."}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSyncing}>
          Cancel
        </Button>
        <Button
          onClick={handleSync}
          disabled={
            !syncFromClient ||
            !syncToClient ||
            syncFromClient === syncToClient ||
            isSyncing
          }
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync"
          )}
        </Button>
      </div>
    </div>
  );
}
