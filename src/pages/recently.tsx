import { ServerCard } from "@/components/recently/ServerCard";
import { useClientPathStore } from "@/stores/clientPathStore";
import { type ServerConfig } from "@/types";
import { ConfigType } from "@/types/mcpConfig";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Type for server list item
type ServerListItem = { name: string; config: ServerConfig };

export default function Recently({ embedded = false }: { embedded?: boolean }) {
  const [serverList, setServerList] = useState<ServerListItem[]>([]);
  const { selectedClient, selectedPath } = useClientPathStore();

  // Load saved server configurations
  useEffect(() => {
    async function checkFileExists(parsed: any) {
      try {
        const exists = await invoke<boolean>("check_mcplinker_config_exists");
        if (!exists) {
          toast.info("start add");
          parsed.forEach(async (s: ServerListItem) => {
            const saveServerItem = {
              clientName: "mcplinker",
              path: "",
              serverName: s.name,
              serverConfig: s.config,
            };
            toast.info(JSON.stringify(saveServerItem));
            try {
              await invoke("add_mcp_server", saveServerItem);
            } catch (e) {
              // already exists
            }
          });
        }
      } catch (e) {
        console.log("Failed to check config file");
      }
    }
    const saved = localStorage.getItem("myservers");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          name: string;
          config: ServerConfig;
        }[];
        checkFileExists(parsed);
        setServerList(parsed);
      } catch (error) {
        console.error("Failed to load myservers:", error);
      }
    }
    invoke<ConfigType>("read_json_file", {
      clientName: "mcplinker",
      path: "",
    }).then((savedData) => {
      const parsed = Object.entries(savedData.mcpServers).map(
        ([name, config]) => ({ name, config }),
      );
      setServerList(parsed);
    });
  }, []);

  // Handle server operations
  const handleDelete = async (key: string) => {
    try {
      const params = {
        clientName: selectedClient,
        path: selectedPath,
        serverName: key,
      };
      await Promise.allSettled([
        invoke("remove_mcp_server", params),
        invoke("remove_mcp_server", { ...params, clientName: "mcplinker" }),
      ]);

      setServerList((prev) => prev.filter((s) => s.name !== key));
      toast.success("Server deleted");
    } catch (error) {
      toast.error("Failed to delete server");
    }
  };

  return (
    <div>
      {!embedded && <h1 className="text-2xl font-semibold p-2">
        Saved Configurations
      </h1>}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${embedded ? "" : "p-2"}`}>
        {serverList.map((server) => (
          <ServerCard
            key={server.name}
            serverKey={server.name}
            config={server.config}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
