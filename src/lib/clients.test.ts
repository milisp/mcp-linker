import { beforeEach, describe, expect, it } from "vitest";
import { type ClientInfo, clientLabel, hasProjectConfig, requiresConfigFile, setClients, takesPath, usesDisabledFlag } from "./clients";

const client = (id: string, overrides: Partial<ClientInfo> = {}): ClientInfo => ({
  id, label: id.toUpperCase(), url: "", storage: "json", serversKey: "mcpServers",
  location: "user", projectFile: null, disable: "stash", free: false, ...overrides,
});

describe("client metadata helpers", () => {
  beforeEach(() => setClients([
    client("claude"),
    client("cursor", { location: "userOrProject", projectFile: ".cursor/mcp.json" }),
    client("custom", { location: "file" }),
    client("cline", { disable: "flag" }),
    client("claude_code", { storage: "claudeCode", location: "claudeCode", disable: "native" }),
  ]));

  it("labels known clients and falls back to the id", () => {
    expect(clientLabel("cursor")).toBe("CURSOR");
    expect(clientLabel("gone")).toBe("gone");
  });

  it("tells project folders from required config files", () => {
    expect(hasProjectConfig("cursor")).toBe(true);
    expect(requiresConfigFile("cursor")).toBe(false);
    expect(requiresConfigFile("custom")).toBe(true);
    expect(["claude", "cursor", "custom", "claude_code", "gone"].filter(takesPath)).toEqual(["cursor", "custom"]);
  });

  it("knows which clients keep disabled entries in place", () => {
    expect(usesDisabledFlag("cline")).toBe(true);
    expect(usesDisabledFlag("claude")).toBe(false);
    expect(usesDisabledFlag("claude_code")).toBe(false);
  });
});
