import type { RegistryServer } from "@/lib/registry/types";
import catalogIndex from "./index.json";

export type { RegistryServer } from "@/lib/registry/types";

export interface CollectionFile {
  title: string;
  description: string;
  servers: string[];
}

// Files are synced from milisp/mcp-servers; index.json sets the display order.
const serverFiles = import.meta.glob<RegistryServer>("./servers/*.json", { eager: true, import: "default" });
const collectionFiles = import.meta.glob<CollectionFile>("./collections/*.json", { eager: true, import: "default" });

export const MCP_REGISTRY_SERVERS: RegistryServer[] = catalogIndex.servers.flatMap(id => serverFiles[`./servers/${id}.json`] ?? []);

export const MCP_COLLECTIONS: Record<string, CollectionFile> = Object.fromEntries(
  (catalogIndex.collections ?? []).flatMap(id => {
    const collection = collectionFiles[`./collections/${id}.json`];
    return collection ? [[id, collection]] : [];
  }),
);
