// Header component for LocalTable actions
// Always use English comments for code
import { UpgradePlanButton } from "@/components/common/UpgradePlanButton";
import { BatchActionsDropdown } from "@/components/manage/BatchActionsDropdown";
import { Button } from "@/components/ui/button";
import { useTier } from "@/hooks/useTier";
import { getEncryptionKey } from "@/utils/encryption";
import { Cloud, Key, Monitor } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router";

interface LocalTableHeaderProps {
  isSyncing: boolean;
  rowSelection: Record<string, unknown>;
  isDeleting: boolean;
  onLocalSync: () => void;
  onCloudSync: () => void;
  handleBatchEnable: () => void;
  handleBatchDisable: () => void;
  handleBatchDelete: () => void;
}

export const LocalTableHeader: React.FC<LocalTableHeaderProps> = ({
  isSyncing,
  rowSelection,
  isDeleting,
  onLocalSync,
  onCloudSync,
  handleBatchEnable,
  handleBatchDisable,
  handleBatchDelete,
}) => {
  const key = getEncryptionKey();
  const navigate = useNavigate();
  const { hasMinimumTier, canUseCloudSync } = useTier();

  // Local sync requires LIFETIME or higher
  const canUseLocalSync = hasMinimumTier("LIFETIME") || import.meta.env.DEV;

  return (
    <div className="flex justify-between items-center">
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
      <BatchActionsDropdown
        hasSelectedRows={Object.keys(rowSelection).length > 0}
        handleBatchEnable={handleBatchEnable}
        handleBatchDisable={handleBatchDisable}
        handleBatchDelete={handleBatchDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};
