import type { SseConfig, StdioServerConfig } from "@/types";
import { registryServerToConfigs } from "@/lib/registry/toConfigs";
import type { RegistryServer } from "@/lib/registry/types";

/** UI projection only; the JSON catalog remains in Registry server.json format. */
export interface MCPServerPreset {
  name: string;
  description: string;
  category: string;
  type: "http" | "sse" | "stdio";
  url?: string;
  command?: string;
  args?: string;
  envVars?: { key: string; placeholder: string; isSecret?: boolean }[];
  headers?: Record<string, string>;
}

export function registryServerToPresets(server: RegistryServer): MCPServerPreset[] {
  const publisher = server._meta?.["io.modelcontextprotocol.registry/publisher-provided"] as
    Record<string, unknown> | undefined;
  const metadata = publisher?.["io.github.milisp.mcp-linker"] as
    { configName?: string; category?: string; fullDescription?: string } | undefined;
  const configs = registryServerToConfigs(server).filter(
    (config): config is SseConfig | StdioServerConfig => config.type !== "encrypted",
  );
  return configs.map((config, index) => {
    const baseName = metadata?.configName ?? server.name.split("/")[1];
    const preset: MCPServerPreset = {
      name: configs.length === 1 ? baseName : `${baseName}-${index + 1}`,
      description: metadata?.fullDescription ?? server.description,
      category: metadata?.category ?? "Other",
      type: config.type,
    };
    if (config.type === "stdio") {
      preset.command = config.command;
      preset.args = config.args?.join(" ");
      const pkg = server.packages?.filter(p => p.registryType !== "mcpb")[index];
      preset.envVars = pkg?.environmentVariables
        ?.filter(input => input.value === undefined)
        .map(input => ({ key: input.name, placeholder: input.placeholder ?? input.name, isSecret: input.isSecret }));
    } else {
      preset.url = config.url;
      preset.headers = config.headers;
    }
    return preset;
  });
}
