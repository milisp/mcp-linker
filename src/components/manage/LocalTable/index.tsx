// Main LocalTable component, refactored to use hooks and header component
import { LocalSyncDialog } from "@/components/manage/LocalSyncDialog";
import { RefreshMcpConfig } from "@/components/manage/RefreshMcpConfig";
import { DataTable } from "@/components/ui/data-table";
import { useMcpConfig } from "@/hooks/useMcpConfig";
import { useClientPathStore } from "@/stores/clientPathStore";
import { RowSelectionState, Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useServerTableColumns } from "../ServerTableColumns";
import { LocalTableHeader } from "./LocalTableHeader";
import { useServersData } from "./useServersData";
import { useSyncHandlers } from "./useSyncHandlers";

export const LocalTable = () => {
  const { selectedClient, selectedPath } = useClientPathStore();
  const [localSyncDialogOpen, setLocalSyncDialogOpen] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const [_tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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

  const [isSyncing, setIsSyncing] = useState(false);

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
  const { handleSync } = useSyncHandlers(syncConfig, setIsSyncing);

  // Header action handlers
  const handleLocalSync = () => setLocalSyncDialogOpen(true);

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
        </>
      )}
    </div>
  );
};
