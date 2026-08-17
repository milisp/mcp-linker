import { useCallback } from "react";

export function useSyncHandlers(
  syncConfig: any,
  setIsSyncing: (syncing: boolean) => void,
) {
  const handleSync = useCallback(
    async (fromClient: string, toClient: string, overrideAll: boolean) => {
      setIsSyncing(true);
      try {
        return await syncConfig(fromClient, toClient, overrideAll);
      } finally {
        setIsSyncing(false);
      }
    },
    [syncConfig, setIsSyncing],
  );

  return { handleSync };
}
