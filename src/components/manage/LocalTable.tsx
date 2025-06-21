import { BatchActionsDropdown } from "@/components/manage/BatchActionsDropdown";
import { CloudSyncDialog } from "@/components/manage/CloudSyncDialog";
import { LocalSyncDialog } from "@/components/manage/LocalSyncDialog";
import { RefreshMcpConfig } from "@/components/manage/RefreshMcpConfig";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useMcpConfig } from "@/hooks/useMcpConfig";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useStatsStore } from "@/stores/statsStore";
import { ServerConfig, ServerTableData } from "@/types";
import { getEncryptionKey } from "@/utils/encryption";
import { RowSelectionState, Table } from "@tanstack/react-table";
import { Cloud, Key, Monitor } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServerTableColumns } from "./ServerTableColumns";

type LocalTableProps = {};

export const LocalTable = ({}: LocalTableProps) => {
  const navigate = useNavigate();
  const { selectedClient, selectedPath } = useClientPathStore();
  const [localSyncDialogOpen, setLocalSyncDialogOpen] = useState(false);
  const [cloudSyncDialogOpen, setCloudSyncDialogOpen] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const [_tableInstance, setTableInstance] =
    useState<Table<ServerTableData> | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { isAuthenticated } = useAuth();
  const setPersonalStats = useStatsStore((s) => s.setPersonalStats);

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

  const serversData = useMemo((): ServerTableData[] => {
    const activeServers = Object.entries(config?.mcpServers ?? {}).map(
      ([name, serverConfig]) =>
        ({
          name,
          ...serverConfig,
        }) as ServerTableData,
    );
    const disabledServersData = Object.entries(disabledServers ?? {}).map(
      ([name, serverConfig]) =>
        ({
          name,
          ...serverConfig,
        }) as ServerTableData,
    );
    const allServers = [...activeServers, ...disabledServersData];
    // Set stats directly to Zustand store
    setPersonalStats({
      total: allServers.length,
      active: activeServers.length,
      disabled: disabledServersData.length,
    });
    return allServers;
  }, [config?.mcpServers, disabledServers, setPersonalStats]);

  const handleSync = useCallback(
    (fromClient: string, toClient: string, overrideAll: boolean) => {
      return syncConfig(fromClient, toClient, overrideAll);
    },
    [syncConfig],
  );

  const { isSyncing, handleCloudUpload, handleCloudDownload } = useCloudSync(
    selectedClient,
    serversData,
  );

  const handleEdit = useCallback(
    (name: string, serverConfig: ServerConfig, isDisabled?: boolean) => {
      updateConfig(name, serverConfig, isDisabled);
    },
    [updateConfig],
  );

  const handleBatchDelete = useCallback(async () => {
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
  }, [batchDeleteServers, rowSelection, serversData, setRowSelection]);

  const handleBatchEnable = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection);
    const selectedNames = selectedIndices.map(
      (index) => serversData[parseInt(index)].name,
    );
    for (const name of selectedNames) {
      await enableServer(name);
    }
    setRowSelection({});
  }, [enableServer, rowSelection, serversData, setRowSelection]);

  const handleBatchDisable = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection);
    const selectedNames = selectedIndices.map(
      (index) => serversData[parseInt(index)].name,
    );
    for (const name of selectedNames) {
      await disableServer(name);
    }
    setRowSelection({});
  }, [disableServer, rowSelection, serversData, setRowSelection]);

  const localColumns = useServerTableColumns({
    disabledServers,
    onEnable: enableServer,
    onDisable: disableServer,
    onEdit: handleEdit,
    onDelete: deleteConfig,
  });

  return (
    <div className="flex flex-col">
      {isAuthenticated ? (
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <div className="h-6 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalSyncDialogOpen(true)}
              disabled={isSyncing}
              className="flex items-center gap-2 hover:bg-accent hover:border-accent-foreground"
            >
              <Monitor className="h-4 w-4" />
              Local Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const key = getEncryptionKey();
                if (!key) {
                  navigate("/settings");
                } else {
                  setCloudSyncDialogOpen(true);
                }
              }}
              disabled={isSyncing}
              className="flex items-center gap-2 hover:bg-accent hover:border-accent-foreground"
            >
              <Cloud className="h-4 w-4" />
              Cloud Sync
              <Key className="h-3 w-3 opacity-60" />
            </Button>
          </div>
          <BatchActionsDropdown
            hasSelectedRows={Object.keys(rowSelection).length > 0}
            handleBatchEnable={handleBatchEnable}
            handleBatchDisable={handleBatchDisable}
            handleBatchDelete={handleBatchDelete}
            isDeleting={isDeleting}
          />
        </div>
      ) : (
        <Button onClick={() => navigate("/auth")}>
          Login to Sync Local or cloud
        </Button>
      )}
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
        </>
      )}
    </div>
  );
};
