// Main LocalTable component, refactored to use hooks and header component
import { CloudSyncDialog } from "@/components/manage/CloudSyncDialog";
import { LocalSyncDialog } from "@/components/manage/LocalSyncDialog";
import { RefreshMcpConfig } from "@/components/manage/RefreshMcpConfig";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useMcpConfig } from "@/hooks/useMcpConfig";
import { useTier } from "@/hooks/useTier";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useGlobalDialogStore } from "@/stores/globalDialogStore";
import { getEncryptionKey } from "@/utils/encryption";
import { RowSelectionState, Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useServerTableColumns } from "../ServerTableColumns";
import { LocalTableHeader } from "./LocalTableHeader";
import { MissingKeyDialog } from "./MissingKeyDialog";
import { useServersData } from "./useServersData";
import { useSyncHandlers } from "./useSyncHandlers";

export const LocalTable = () => {
  const { isAuthenticated } = useAuth();
  const { selectedClient, selectedPath } = useClientPathStore();
  const [localSyncDialogOpen, setLocalSyncDialogOpen] = useState(false);
  const [cloudSyncDialogOpen, setCloudSyncDialogOpen] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const [_tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showMissingKeyDialog, setShowMissingKeyDialog] = useState(false);
  const showGlobalDialog = useGlobalDialogStore((s) => s.showDialog);
  const key = getEncryptionKey();

  const {
    config,
    disabledServers,
    syncConfig,
    updateConfig,
    deleteConfig,
    enableServer,
    disableServer,
    batchDeleteServers,
    error,
    loadConfig,
  } = useMcpConfig(selectedClient, selectedPath);

  const serversData = useServersData(config, disabledServers, selectedClient);

  const { isSyncing, handleCloudUpload, handleCloudDownload } = useCloudSync(
    selectedClient,
    serversData,
  );

  // Batch actions
  const handleBatchDelete = async () => {
    try {
      const selectedIndices = Object.keys(rowSelection);
      const selectedNames = selectedIndices.map(
        (index) => serversData[parseInt(index)].name,
      );
      await batchDeleteServers(selectedNames);
      setRowSelection({});
    } catch (error) {
      console.error("Batch delete operation failed:", error);
    }
  };

  const handleBatchEnable = async () => {
    const selectedIndices = Object.keys(rowSelection);
    const selectedNames = selectedIndices.map(
      (index) => serversData[parseInt(index)].name,
    );
    for (const name of selectedNames) {
      await enableServer(name);
    }
    setRowSelection({});
  };

  const handleBatchDisable = async () => {
    const selectedIndices = Object.keys(rowSelection);
    const selectedNames = selectedIndices.map(
      (index) => serversData[parseInt(index)].name,
    );
    for (const name of selectedNames) {
      await disableServer(name);
    }
    setRowSelection({});
  };

  // Edit handler
  const handleEdit = (
    name: string,
    serverConfig: any,
    isDisabled?: boolean,
  ) => {
    updateConfig(name, serverConfig, isDisabled);
  };

  // Sync handlers
  const { handleSync } = useSyncHandlers(
    syncConfig,
    handleCloudUpload,
    handleCloudDownload,
  );

  // Header action handlers
  const handleLocalSync = () => setLocalSyncDialogOpen(true);
  const { canUseCloudSync } = useTier();

  const handleCloudSync = () => {
    if (!isAuthenticated) {
      showGlobalDialog("login");
      return;
    }

    // Check if user has Professional or Team tier for cloud sync
    if (!canUseCloudSync) {
      showGlobalDialog("upgrade");
      return;
    }

    if (!key) {
      setShowMissingKeyDialog(true);
      return;
    } else {
      setCloudSyncDialogOpen(true);
    }
  };

  const localColumns = useServerTableColumns({
    disabledServers,
    onEnable: enableServer,
    onDisable: disableServer,
    onEdit: handleEdit,
    onDelete: deleteConfig,
  });

  // Listen for refresh events from the refresh context
  useEffect(() => {
    const handleServerListChanged = (event: CustomEvent) => {
      const { client, path } = event.detail || {};
      
      // Refresh if this matches our current client/path or if no specific client/path is provided
      if (!client || !path || (client === selectedClient && path === selectedPath)) {
        loadConfig();
      }
    };

    const handleDataRefresh = () => {
      loadConfig();
    };

    window.addEventListener('mcpServerListChanged', handleServerListChanged as EventListener);
    window.addEventListener('mcpDataRefresh', handleDataRefresh as EventListener);

    return () => {
      window.removeEventListener('mcpServerListChanged', handleServerListChanged as EventListener);
      window.removeEventListener('mcpDataRefresh', handleDataRefresh as EventListener);
    };
  }, [selectedClient, selectedPath, loadConfig]);

  return (
    <div className="flex flex-col">
      <LocalTableHeader
        isSyncing={isSyncing}
        onLocalSync={handleLocalSync}
        onCloudSync={handleCloudSync}
      />
      {error ? (
        <RefreshMcpConfig error={error} onRetry={loadConfig} />
      ) : (
        <>
          <DataTable
            columns={localColumns}
            data={serversData}
            searchKey="name"
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            onTableInstanceChange={setTableInstance}
            batchActions={{
              handleBatchEnable,
              handleBatchDisable,
              handleBatchDelete,
              isDeleting,
            }}
          />
          <LocalSyncDialog
            open={localSyncDialogOpen}
            onOpenChange={setLocalSyncDialogOpen}
            onLocalSync={handleSync}
            currentClient={selectedClient}
            isSyncing={isSyncing}
          />
          <CloudSyncDialog
            open={cloudSyncDialogOpen}
            onOpenChange={setCloudSyncDialogOpen}
            onCloudUpload={handleCloudUpload}
            onCloudDownload={handleCloudDownload}
            isSyncing={isSyncing}
            servers={serversData}
            onCloudDownloadSuccess={loadConfig}
          />
          <MissingKeyDialog
            open={showMissingKeyDialog}
            onOpenChange={setShowMissingKeyDialog}
          />
        </>
      )}
    </div>
  );
};
