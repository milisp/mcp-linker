import { DeleteAlertDialog } from "@/components/common/DeleteAlertDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { useCloudSync } from "@/hooks/useCloudSync";
import { api } from "@/lib/api";
import { useClientPathStore } from "@/stores/clientPathStore";
import { ServerTableData } from "@/types";
import { ColumnDef, RowSelectionState, Table } from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CommandDisplay } from "./CommandDisplay";

export const PersonalCloudTable = () => {
  const [_tableInstance, setTableInstance] =
    useState<Table<ServerTableData> | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [serversData, setServersData] = useState<ServerTableData[]>([]);
  const { selectedClient, selectedPath } = useClientPathStore();

  const { fetchCloudDownload } = useCloudSync("", serversData);

  useEffect(() => {
    let isMounted = true;
    fetchCloudDownload().then((cloudData) => {
      console.log("cloudData", cloudData);
      if (isMounted && cloudData) {
        setServersData(cloudData);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const columns: ColumnDef<ServerTableData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Server Name",
    },
    {
      id: "command",
      header: "Command",
      cell: ({ row }) => <CommandDisplay config={row.original} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const serverName = row.original.name;
        const serverId = row.original.id;
        const serverConfig = row.original;
        return (
          <span>
            <Button
              onClick={async () => {
                await invoke("add_mcp_server", {
                  clientName: selectedClient,
                  path: selectedPath || undefined,
                  serverName: serverName,
                  serverConfig: serverConfig,
                });
                toast.success(`add server ${serverName}`);
              }}
            >
              add
            </Button>

            <DeleteAlertDialog
              itemName={`the server "${serverName}"`}
              onDelete={async () => {
                try {
                  await api.delete(`/user-server-configs/${serverId}`);
                  setServersData((prevData) =>
                    prevData.filter((server) => server.id !== serverId),
                  );
                  toast.success(`remove server ${serverId} ${serverName}`);
                } catch (e) {
                  toast.error(JSON.stringify(e));
                }
              }}
            />
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center"></div>
      <DataTable
        columns={columns}
        data={serversData}
        searchKey="name"
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        onTableInstanceChange={setTableInstance}
      />
    </div>
  );
};
