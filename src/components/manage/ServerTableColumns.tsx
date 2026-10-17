import { Button } from "@/components/ui/button";
import { useViewStore } from "@/stores/viewStore";
import { installedServerPath } from "@/components/server/utils/installedServer";
import { Checkbox } from "@/components/ui/checkbox";
import { ServerConfig, ServerTableData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ServerActionButtons } from "./ServerActionButtons";
import { ServerStatusSwitch } from "./ServerStatusSwitch";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";

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
}: ServerTableColumnsProps): ColumnDef<ServerTableData>[] => {
  const { t } = useTranslation();
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t("manage.selectAll")}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t("manage.selectRow")}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: t("manage.name"),
    cell: ({ row }) => {
      const serverName = row.original.name;
      return (
        <button
          type="button"
          className="font-medium text-left hover:underline"
          onClick={() => useViewStore.getState().navigate(installedServerPath(serverName, "connection"))}
        >
          {serverName}
        </button>
      );
    },
  },
  {
    id: "status",
    header: t("manage.enabled"),
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
    header: () => <div className="text-right">{t("manage.actions")}</div>,
    cell: ({ row }) => {
      const serverName = row.original.name;
      const serverConfig = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label={`${t("manage.tools")}: ${serverName}`} title={t("manage.tools")} onClick={() => useViewStore.getState().navigate(installedServerPath(serverName))}><Wrench className="size-4" /></Button>
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
};
