// Types for the official MCP registry API (registry.modelcontextprotocol.io).
// Mirrors https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

export interface RegistryInput {
  value?: string;
  default?: string;
  description?: string;
  format?: "string" | "number" | "boolean" | "filepath";
  isRequired?: boolean;
  isSecret?: boolean;
  choices?: string[];
  placeholder?: string;
  variables?: Record<string, RegistryInput>;
}

export interface RegistryKeyValueInput extends RegistryInput {
  name: string;
}

export type RegistryArgument = RegistryInput & {
  type: "positional" | "named";
  name?: string;
  valueHint?: string;
  isRepeated?: boolean;
};

export interface RegistryTransport {
  type: "stdio" | "sse" | "streamable-http";
  url?: string;
  headers?: RegistryKeyValueInput[];
}

export interface RegistryPackage {
  registryType: string;
  registryBaseUrl?: string;
  identifier: string;
  version?: string;
  runtimeHint?: string;
  runtimeArguments?: RegistryArgument[];
  packageArguments?: RegistryArgument[];
  environmentVariables?: RegistryKeyValueInput[];
  transport?: RegistryTransport;
}

export interface RegistryServer {
  name: string;
  title?: string;
  description: string;
  version: string;
  websiteUrl?: string;
  repository?: { url: string; source?: string; subfolder?: string };
  icons?: { src: string; sizes?: string; mimeType?: string }[];
  packages?: RegistryPackage[];
  remotes?: RegistryTransport[];
}

export interface RegistryServerEntry {
  server: RegistryServer;
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: {
      status?: string;
      publishedAt?: string;
      updatedAt?: string;
      isLatest?: boolean;
    };
  };
}

export interface RegistryListResponse {
  servers: RegistryServerEntry[];
  metadata: { count: number; nextCursor?: string };
}
