import type { ServerType } from "@/types";
import { registryServerToConfigs } from "./toConfigs";
import type { RegistryInput, RegistryListResponse, RegistryServerEntry } from "./types";

export * from "./types";
export { registryServerToConfigs } from "./toConfigs";

export const REGISTRY_BASE_URL =
  import.meta.env.VITE_REGISTRY_BASE_URL ??
  "https://registry.modelcontextprotocol.io";

const OFFICIAL_NAMESPACE = "io.modelcontextprotocol";

function toDeveloper(name: string): string {
  const namespace = name.split("/")[0];
  // io.github.<user> and similar reverse-DNS names read better as just the user.
  return namespace.startsWith("io.github.")
    ? namespace.slice("io.github.".length)
    : namespace;
}

function needsInput(input: RegistryInput): boolean {
  if (Object.values(input.variables ?? {}).some(needsInput)) return true;
  return input.isRequired === true && input.value === undefined && input.default === undefined;
}

export function entryToServerType(entry: RegistryServerEntry): ServerType {
  const { server } = entry;
  return {
    id: server.name,
    name: server.title || server.name,
    developer: toDeveloper(server.name),
    logoUrl: server.icons?.[0]?.src,
    description: server.description,
    source: server.repository?.url ?? server.websiteUrl ?? "",
    isOfficial: server.name.startsWith(`${OFFICIAL_NAMESPACE}/`),
    version: server.version,
    isFavorited: false,
    configs: registryServerToConfigs(server),
    requiresConfiguration: (server.packages ?? []).some(pkg =>
      [...(pkg.environmentVariables ?? []), ...(pkg.runtimeArguments ?? []), ...(pkg.packageArguments ?? []), ...(pkg.transport?.headers ?? [])].some(needsInput),
    ) || (server.remotes ?? []).some(remote =>
      [...(remote.headers ?? []), ...Object.values(remote.variables ?? {})].some(needsInput),
    ),
  };
}

export interface RegistryPage {
  servers: ServerType[];
  nextCursor?: string;
}

export async function fetchRegistryServers({
  cursor,
  search,
  limit = 30,
  signal,
}: {
  cursor?: string;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<RegistryPage> {
  const params = new URLSearchParams({
    version: "latest",
    limit: String(limit),
  });
  if (cursor) params.set("cursor", cursor);
  if (search) params.set("search", search);

  const res = await fetch(
    `${REGISTRY_BASE_URL}/v0/servers?${params.toString()}`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(`Registry request failed: ${res.status} ${res.statusText}`);
  }

  const data: RegistryListResponse = await res.json();
  return {
    servers: (data.servers ?? []).map(entryToServerType),
    nextCursor: data.metadata?.nextCursor,
  };
}

export async function fetchRegistryServer(
  name: string,
  signal?: AbortSignal,
): Promise<ServerType | null> {
  const res = await fetch(
    `${REGISTRY_BASE_URL}/v0/servers/${encodeURIComponent(name)}/versions/latest`,
    { signal },
  );
  if (!res.ok) return null;
  const entry: RegistryServerEntry = await res.json();
  return entryToServerType(entry);
}
