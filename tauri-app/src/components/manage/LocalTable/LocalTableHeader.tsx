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
  const { isFree } = useTier();

  return (
    <div className="flex justify-between items-center">
      {!isFree ?
        <div className="flex gap-3 items-center">
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
            <Button onClick={() => navigate("/settings")}>
              <Cloud className="h-4 w-4" />
              Go to generate encryption key for end to end sync to cloud
            </Button>
          )}
        </div>
        : <div className="flex gap-3 items-center">
            <UpgradePlanButton /> to sync bewteen multi clients
          </div>
      }
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
