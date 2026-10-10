import { entryToServerType } from "@/lib/registry";
import type { ServerConfig, ServerType } from "@/types";
import { MCP_REGISTRY_SERVERS } from "./index";

export const CURATED_SERVERS: ServerType[] = MCP_REGISTRY_SERVERS.map(server => {
  const publisher = server._meta?.["io.modelcontextprotocol.registry/publisher-provided"] as
    Record<string, unknown> | undefined;
  const metadata = publisher?.["io.github.milisp.mcp-linker"] as
    { category?: string; fullDescription?: string } | undefined;
  return {
    ...entryToServerType({ server }),
    developer: "MCP Linker catalog",
    description: metadata?.fullDescription ?? server.description,
    tags: metadata?.category ? [metadata.category] : [],
    // Catalog revisions are not upstream software versions.
    version: undefined,
  };
});

export const CURATED_SERVER_IDS = new Set(CURATED_SERVERS.map(server => server.id));

export const FEATURED_SERVER_IDS = new Set(MCP_REGISTRY_SERVERS.filter(server => {
  const publisher = server._meta?.["io.modelcontextprotocol.registry/publisher-provided"] as
    Record<string, unknown> | undefined;
  const metadata = publisher?.["io.github.milisp.mcp-linker"] as
    { featured?: boolean } | undefined;
  return metadata?.featured === true;
}).map(server => server.name));

function connectionKey(config: ServerConfig): string {
  if (config.type === "encrypted") return JSON.stringify(config);
  return config.type === "stdio"
    ? JSON.stringify([config.type, config.command, config.args])
    : JSON.stringify([config.type, config.url, Object.entries(config.headers ?? {}).sort(([a], [b]) => a.localeCompare(b))]);
}

/** Local definitions stay available while Registry pages load or fail. */
export function mergeCatalogServers(registryServers: ServerType[], keyword = ""): ServerType[] {
  const terms = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const local = CURATED_SERVERS.filter(server => {
    const text = [server.name, server.description, ...(server.tags ?? [])].join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  });
  const ids = new Set(local.map(server => server.id));
  const connections = new Set(local.flatMap(server => (server.configs ?? []).map(connectionKey)));
  const merged = [...local];
  for (const server of registryServers) {
    if (ids.has(server.id)) continue;
    const configs = server.configs ?? [];
    // Keep entries offering additional connections, even if one endpoint overlaps.
    if (configs.length && configs.every(config => connections.has(connectionKey(config)))) continue;
    ids.add(server.id);
    merged.push(server);
  }
  return merged;
}

export function findCatalogServer(id: string): ServerType | undefined {
  return CURATED_SERVERS.find(server => server.id === id);
}
