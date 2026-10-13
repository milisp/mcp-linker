import { ServerList } from "@/components/server";
import { fetchSavedServers, removeSavedServer } from "@/components/server/utils/savedServer";
import { clientWrite } from "@/lib/claude";
import type { ServerConfig, ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** Copies configurations saved by older versions in localStorage into the mcplinker config, once. */
async function migrateLocalStorage() {
  const legacy = localStorage.getItem("myservers");
  if (!legacy || await invoke<boolean>("check_mcplinker_config_exists")) return;
  const servers = JSON.parse(legacy) as { name: string; config: ServerConfig }[];
  await Promise.allSettled(servers.map(server => clientWrite("add_mcp_server", {
    clientName: "mcplinker", path: "", serverName: server.name, serverConfig: server.config,
  })));
}

export default function Recently({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const [servers, setServers] = useState<ServerType[] | null>(null);

  useEffect(() => {
    migrateLocalStorage()
      .catch(error => console.error("Failed to migrate saved servers:", error))
      .then(fetchSavedServers)
      .then(setServers)
      .catch(error => {
        toast.error(`Failed to load saved configurations: ${error instanceof Error ? error.message : String(error)}`);
        setServers([]);
      });
  }, []);

  const remove = async (server: ServerType) => {
    try {
      await removeSavedServer(server.name);
      setServers(current => current?.filter(item => item.name !== server.name) ?? null);
      toast.success(`Removed ${server.name} from saved`);
    } catch (error) {
      toast.error(`Failed to remove ${server.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className={embedded ? "" : "p-4"}>
      {!embedded && <h1 className="mb-4 text-2xl font-semibold">{t("manage.saved")}</h1>}
      {servers && <ServerList mcpServers={servers} onRemove={remove} emptyMessage={t("manage.savedEmpty")} />}
    </div>
  );
}
