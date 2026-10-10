import type { ServerConfig } from "@/types";

export function normalizeServerConfig(value: Record<string, unknown>): ServerConfig | null {
  if (typeof value.command === "string") {
    return { ...value, type: "stdio", command: value.command, args: Array.isArray(value.args) ? value.args as string[] : [], env: value.env as Record<string, string> | undefined };
  }
  if (typeof value.url === "string") {
    const { http_headers, ...connection } = value;
    return { ...connection, type: value.type === "sse" ? "sse" : "http", url: value.url, headers: (value.headers ?? http_headers ?? {}) as Record<string, string> };
  }
  return null;
}

