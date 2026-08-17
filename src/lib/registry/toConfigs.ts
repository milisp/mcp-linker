import type { ServerConfig, SseConfig, StdioServerConfig } from "@/types";
import type {
  RegistryArgument,
  RegistryKeyValueInput,
  RegistryPackage,
  RegistryServer,
  RegistryTransport,
} from "./types";

// Default runtime command per package registry, used when runtimeHint is absent.
const RUNTIME_BY_REGISTRY: Record<string, string> = {
  npm: "npx",
  pypi: "uvx",
  oci: "docker",
  nuget: "dnx",
};

function versionedIdentifier(pkg: RegistryPackage): string {
  if (!pkg.version) return pkg.identifier;
  switch (pkg.registryType) {
    case "pypi":
      return `${pkg.identifier}==${pkg.version}`;
    case "oci":
      return `${pkg.identifier}:${pkg.version}`;
    default:
      return `${pkg.identifier}@${pkg.version}`;
  }
}

// A value the user still has to fill in is rendered as a placeholder so it
// shows up in the config editor instead of silently disappearing.
function inputValue(input: RegistryArgument | RegistryKeyValueInput): string {
  return (
    input.value ??
    input.default ??
    `<${("name" in input && input.name) || (input as RegistryArgument).valueHint || "value"}>`
  );
}

function argsToStrings(args: RegistryArgument[] = []): string[] {
  return args.flatMap((arg) => {
    if (arg.type === "named" && arg.name) {
      const value = arg.value ?? arg.default;
      return value ? [arg.name, value] : [arg.name];
    }
    return [inputValue(arg)];
  });
}

function envToRecord(
  vars: RegistryKeyValueInput[] = [],
): Record<string, string> {
  return Object.fromEntries(vars.map((v) => [v.name, inputValue(v)]));
}

function remoteToConfig(transport: RegistryTransport): SseConfig | null {
  if (!transport.url) return null;
  return {
    type: transport.type === "sse" ? "sse" : "http",
    url: transport.url,
    headers: transport.headers?.length
      ? Object.fromEntries(transport.headers.map((h) => [h.name, inputValue(h)]))
      : undefined,
  };
}

function packageToConfig(pkg: RegistryPackage): ServerConfig | null {
  // A package can also describe a remote endpoint rather than a local process.
  if (pkg.transport && pkg.transport.type !== "stdio") {
    return remoteToConfig(pkg.transport);
  }

  // mcpb bundles are a downloadable archive, not a runnable command.
  if (pkg.registryType === "mcpb") return null;

  const command =
    pkg.runtimeHint ?? RUNTIME_BY_REGISTRY[pkg.registryType] ?? pkg.identifier;

  const args: string[] = [...argsToStrings(pkg.runtimeArguments)];
  const env = envToRecord(pkg.environmentVariables);

  if (command === "npx") {
    args.unshift("-y");
    args.push(versionedIdentifier(pkg));
  } else if (command === "docker") {
    args.push("run", "-i", "--rm");
    for (const name of Object.keys(env)) args.push("-e", name);
    args.push(versionedIdentifier(pkg));
  } else if (command !== pkg.identifier) {
    args.push(versionedIdentifier(pkg));
  }

  args.push(...argsToStrings(pkg.packageArguments));

  const config: StdioServerConfig = { type: "stdio", command, args };
  if (Object.keys(env).length > 0) config.env = env;
  return config;
}

/**
 * Derives installable MCP client configs from a registry server entry.
 * Local packages come first, then remote endpoints.
 */
export function registryServerToConfigs(server: RegistryServer): ServerConfig[] {
  const fromPackages = (server.packages ?? [])
    .map(packageToConfig)
    .filter((c): c is ServerConfig => c !== null);
  const fromRemotes = (server.remotes ?? [])
    .map(remoteToConfig)
    .filter((c): c is SseConfig => c !== null);

  return [...fromPackages, ...fromRemotes];
}
