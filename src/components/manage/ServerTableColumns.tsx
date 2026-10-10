import { Button } from "@/components/ui/button";
import { useViewStore } from "@/stores/viewStore";
import { installedServerPath } from "@/components/server/utils/installedServer";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ServerConfig, ServerTableData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { CommandDisplay } from "./CommandDisplay";
import { ServerActionButtons } from "./ServerActionButtons";
import { ServerStatusSwitch } from "./ServerStatusSwitch";

interface ServerTableColumnsProps {
  disabledServers: Record<string, ServerConfig>;
  onEnable: (name: string) => Promise<void>;
  onDisable: (name: string) => Promise<void>;
  onEdit: (name: string, config: ServerConfig, isDisabled?: boolean) => void;
  onDelete: (name: string) => void;
}

export const useServerTableColumns = ({
  disabledServers,
  onEnable,
  onDisable,
  onEdit,
  onDelete,
}: ServerTableColumnsProps): ColumnDef<ServerTableData>[] => [
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
    cell: ({ row }) => {
      const serverName = row.original.name;
      const isServerActive = !disabledServers?.[serverName];
      return (
        <div className="flex items-center gap-2">
          <button type="button" className="font-medium text-left hover:underline" onClick={() => useViewStore.getState().navigate(installedServerPath(serverName, "connection"))}>{serverName}</button>
          <Badge
            variant={isServerActive ? "default" : "secondary"}
            className={`text-xs ${
              isServerActive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isServerActive ? "Active" : "Disabled"}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "command",
    header: "Command",
    cell: ({ row }) => <CommandDisplay config={row.original} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const serverName = row.original.name;
      const isServerActive = !disabledServers?.[serverName];
      return (
        <ServerStatusSwitch
          serverName={serverName}
          isActive={isServerActive}
          onEnable={onEnable}
          onDisable={onDisable}
        />
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const serverName = row.original.name;
      const serverConfig = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => useViewStore.getState().navigate(installedServerPath(serverName))}>Tools</Button>
          <ServerActionButtons
          serverName={serverName}
          serverConfig={serverConfig}
          onEdit={onEdit}
          onDelete={onDelete}
          onEnable={onEnable}
          disabledServers={disabledServers}
          />
        </div>
      );
    },
  },
];
