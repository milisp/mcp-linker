// Custom hook to get servers data and update stats
// Always use English comments for code
import { useStatsStore } from "@/stores/statsStore";
import { ServerTableData } from "@/types";
import { useEffect, useMemo } from "react";

export function useServersData(
  config: any,
  disabledServers: any,
  selectedClient: string,
) {
  const setPersonalStats = useStatsStore((s) => s.setPersonalStats);

  const activeServers = useMemo(() => {
    return Object.entries(config?.mcpServers ?? {})
      .filter(([_, serverConfig]) => {
        if (typeof serverConfig !== "object" || serverConfig === null)
          return false;
        if (selectedClient === "cline") {
          return !(
            "disabled" in serverConfig && (serverConfig as any).disabled
          );
        } else if (selectedClient === "claude_code") {
          // Exclude entries present in disabledServers
          // const name = (serverConfig as any).name; // name not present in config; compare by key instead
          return true; // filter by key below
        }
        return true;
      })
      .map(
        ([name, serverConfig]) =>
          ({
            name,
            ...(typeof serverConfig === "object" && serverConfig !== null
              ? serverConfig
              : {}),
          }) as ServerTableData,
      )
      .filter((s) =>
        selectedClient === "claude_code" ? !(s.name in (disabledServers || {})) : true,
      );
  }, [config?.mcpServers, selectedClient, disabledServers]);

  const disabledServersData = useMemo(() => {
    return Object.entries(disabledServers ?? {}).map(
      ([name, serverConfig]) =>
        ({
          name,
          ...(typeof serverConfig === "object" && serverConfig !== null
            ? serverConfig
            : {}),
        }) as ServerTableData,
    );
  }, [disabledServers]);

  const allServers = useMemo(() => {
    return [...activeServers, ...disabledServersData];
  }, [activeServers, disabledServersData]);

  useEffect(() => {
    setPersonalStats({
      total: allServers.length,
      active: activeServers.length,
      disabled: disabledServersData.length,
    });
  }, [
    allServers.length,
    activeServers.length,
    disabledServersData.length,
    setPersonalStats,
  ]);

  return allServers;
}
