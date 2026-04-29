import { UpgradePlanButton } from "@/components/common/UpgradePlanButton";
import { Button } from "@/components/ui/button";
import { useTier } from "@/hooks/useTier";
import { useViewStore } from "@/stores/viewStore";
import { getEncryptionKey } from "@/utils/encryption";
import { Cloud, Key, Monitor } from "lucide-react";
import React from "react";

interface LocalTableHeaderProps {
  isSyncing: boolean;
  onLocalSync: () => void;
  onCloudSync: () => void;
}

export const LocalTableHeader: React.FC<LocalTableHeaderProps> = ({
  isSyncing,
  onLocalSync,
  onCloudSync,
}) => {
  const key = getEncryptionKey();
  const { navigate } = useViewStore();
  const { hasMinimumTier, canUseCloudSync } = useTier();

  // Local sync requires LIFETIME or higher
  const canUseLocalSync = hasMinimumTier("LIFETIME") || import.meta.env.DEV;

  return (
    <div className="flex gap-3 items-center">
        {canUseLocalSync ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onLocalSync}
            disabled={isSyncing}
            className="flex items-center gap-2 hover:bg-accent hover:border-accent-foreground"
          >
            <Monitor className="h-4 w-4" />
            Local Sync
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4 opacity-50" />
            <span>Local Sync 🔒</span>
            <UpgradePlanButton />
          </div>
        )}

        {canUseCloudSync ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onCloudSync}
              disabled={isSyncing}
              className="flex items-center gap-2 hover:bg-accent hover:border-accent-foreground"
            >
              <Cloud className="h-4 w-4" />
              Cloud Sync
              <Key className="h-3 w-3 opacity-60" />
            </Button>

            {!key && (
              <Button onClick={() => navigate("/settings")} size="sm" variant="outline">
                <Cloud className="h-4 w-4 mr-2" />
                Generate Encryption Key
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cloud className="h-4 w-4 opacity-50" />
            <span>Cloud Sync 🔒</span>
            <UpgradePlanButton />
          </div>
        )}
    </div>
  );
};
