import { describe as group, expect, it } from "vitest";
import {
  buildSourceOptions,
  ccLabel,
  ccSource,
  convertServer,
  describe,
  missingNames,
  parseCCSource,
  rightNamesOf,
  sidebarProjects,
  stageCopy,
  targetValueOf,
  toggleDelete,
} from "./localSync";

const staged = (toCopy: string[] = [], toDelete: string[] = []) => ({ toCopy: new Set(toCopy), toDelete: new Set(toDelete) });
const lists = ({ toCopy, toDelete }: { toCopy: Set<string>; toDelete: Set<string> }) => ({ toCopy: [...toCopy], toDelete: [...toDelete] });

group("Claude Code source values", () => {
  it("round-trips scope and project", () => {
    expect(parseCCSource(ccSource("local", "/work/app"))).toEqual({ scope: "local", dir: "/work/app" });
    expect(parseCCSource(ccSource("project", "C:\\work\\app"))).toEqual({ scope: "project", dir: "C:\\work\\app" });
  });

  it("keeps a project path that contains the separator", () => {
    expect(parseCCSource(ccSource("local", "/work/a|b")).dir).toBe("/work/a|b");
  });

  it("ignores the project for user scope", () => {
    expect(ccSource("user", "/work/app")).toBe(ccSource("user", ""));
  });

  it("labels with the project basename and scope", () => {
    expect(ccLabel("local", "/work/app/")).toBe("Claude Code · app · Local");
    expect(ccLabel("user", "")).toBe("Claude Code · User");
  });
});

group("buildSourceOptions", () => {
  const clients = [
    { value: "claude_code", label: "Claude Code" },
    { value: "cursor", label: "Cursor" },
    { value: "claude", label: "Claude Desktop" },
  ];

  it("offers each project in local and project scope, user scope, then other clients", () => {
    const { sourceOptions, others } = buildSourceOptions(["/a", "/b"], clients, "claude");
    expect(sourceOptions.map(option => option.value)).toEqual([
      ccSource("local", "/a"),
      ccSource("project", "/a"),
      ccSource("local", "/b"),
      ccSource("project", "/b"),
      ccSource("user", ""),
      "cursor",
    ]);
    expect(others.map(option => option.value)).toEqual(["cursor"]);
  });

  it("leaves out the Claude Code target project and scope only", () => {
    const target = targetValueOf("claude_code", "local", "/a");
    const values = buildSourceOptions(["/a"], clients, target).sourceOptions.map(option => option.value);
    expect(values).not.toContain(target);
    expect(values).toContain(ccSource("project", "/a"));
    expect(values).toContain("claude");
  });
});

group("sidebarProjects", () => {
  it("adds the selected project once", () => {
    expect(sidebarProjects(["/a"], "/b")).toEqual(["/a", "/b"]);
    expect(sidebarProjects(["/a", "/b"], "/a")).toEqual(["/a", "/b"]);
    expect(sidebarProjects(undefined, null)).toEqual([]);
  });
});

group("staging", () => {
  it("copy adds names and cancels a staged delete of the same name", () => {
    expect(lists(stageCopy(staged(["x"], ["y", "z"]), ["y"]))).toEqual({ toCopy: ["x", "y"], toDelete: ["z"] });
  });

  it("toggleDelete unstages a copy before touching deletes", () => {
    expect(lists(toggleDelete(staged(["x"]), ["x"]))).toEqual({ toCopy: [], toDelete: [] });
  });

  it("toggleDelete stages and then restores an existing server", () => {
    const once = toggleDelete(staged(), ["y"]);
    expect(lists(once)).toEqual({ toCopy: [], toDelete: ["y"] });
    expect(lists(toggleDelete(once, ["y"]))).toEqual({ toCopy: [], toDelete: [] });
  });

  it("does not mutate the input sets", () => {
    const before = staged(["x"], ["y"]);
    stageCopy(before, ["y"]);
    toggleDelete(before, ["x", "z"]);
    expect(lists(before)).toEqual({ toCopy: ["x"], toDelete: ["y"] });
  });
});

group("pane contents", () => {
  const source = { a: { command: "a" }, b: { command: "b" }, c: { url: "https://c" } };
  const target = { b: { command: "old" }, d: { command: "d" } };

  it("copy missing skips names already in the target or staged", () => {
    expect(missingNames(source, target, new Set(["c"]))).toEqual(["a"]);
  });

  it("right pane lists target servers plus staged copies without duplicates", () => {
    expect(rightNamesOf(target, new Set(["b", "a"]))).toEqual(["b", "d", "a"]);
  });
});

group("server config helpers", () => {
  it("describe shows the command line or the url", () => {
    expect(describe({ command: "npx", args: ["-y", "pkg"] })).toBe("npx -y pkg");
    expect(describe({ serverUrl: "https://s" })).toBe("https://s");
    expect(describe({})).toBe("");
  });
});

group("convertServer", () => {
  const stdio = { command: "npx", args: ["-y", "pkg"], env: { KEY: "v" }, disabled: true, autoApprove: ["x"], _creator: "mcp_linker" };
  const remote = { url: "https://mcp.example.com/mcp", headers: { Authorization: "Bearer t" } };

  it("drops client-only and bookkeeping keys from stdio servers", () => {
    expect(convertServer("cursor", stdio)).toEqual({ command: "npx", args: ["-y", "pkg"], env: { KEY: "v" } });
  });

  it("adds the type VS Code and Codex need", () => {
    expect(convertServer("copilot", stdio)).toMatchObject({ type: "stdio", command: "npx" });
    expect(convertServer("copilot", remote)).toEqual({ type: "http", ...remote });
    expect(convertServer("codex", stdio)).toMatchObject({ type: "stdio" });
  });

  it("writes Copilot CLI stdio servers with the type its config uses", () => {
    expect(convertServer("copilot_cli", stdio)).toMatchObject({ type: "stdio", command: "npx" });
    expect(convertServer("copilot_cli", remote)).toEqual({ type: "http", ...remote });
  });

  it("spells streamable HTTP the way Cline requires", () => {
    expect(convertServer("cline", remote)).toEqual({ type: "streamableHttp", ...remote });
    expect(convertServer("cline", { ...remote, type: "sse" })).toMatchObject({ type: "sse" });
  });

  it("maps Codex http_headers both ways", () => {
    expect(convertServer("codex", remote)).toEqual({ type: "http", url: remote.url, http_headers: remote.headers });
    expect(convertServer("cursor", { type: "http", url: remote.url, http_headers: remote.headers, enabled: false })).toEqual(remote);
  });

  it("reads other clients' url keys and transport spellings", () => {
    expect(convertServer("copilot", { serverUrl: "https://a" })).toEqual({ type: "http", url: "https://a" });
    expect(convertServer("copilot", { httpUrl: "https://a" })).toEqual({ type: "http", url: "https://a" });
    expect(convertServer("copilot", { type: "streamableHttp", url: "https://a" })).toEqual({ type: "http", url: "https://a" });
    expect(convertServer("copilot", { transportType: "sse", url: "https://a" })).toEqual({ type: "sse", url: "https://a" });
  });

  it("bridges remote servers through mcp-remote for Claude Desktop, with headers in env", () => {
    expect(convertServer("claude", remote)).toEqual({
      command: "npx",
      args: ["-y", "mcp-remote", remote.url, "--header", "Authorization:${MCP_REMOTE_HEADER_0}"],
      env: { MCP_REMOTE_HEADER_0: "Bearer t" },
    });
    expect(convertServer("claude", { type: "sse", url: "https://a" }).args).toEqual(["-y", "mcp-remote", "https://a", "--transport", "sse-only"]);
  });

  it("unwraps an mcp-remote bridge back into a remote server", () => {
    expect(convertServer("cursor", convertServer("claude", remote))).toEqual(remote);
    expect(convertServer("claude_code", { command: "npx", args: ["mcp-remote@0.1.29", "https://a", "--transport", "sse-only"] }))
      .toEqual({ type: "sse", url: "https://a" });
  });

  it("keeps a bridge with options it cannot carry as a stdio server", () => {
    const bridge = { command: "npx", args: ["-y", "mcp-remote", "https://a", "3334"] };
    expect(convertServer("cursor", bridge)).toEqual(bridge);
  });

  it("stringifies non-string env values and keeps cwd where supported", () => {
    expect(convertServer("cline", { command: "node", env: { PORT: 3000 }, cwd: "/srv" })).toEqual({ command: "node", args: [], env: { PORT: "3000" }, cwd: "/srv" });
    expect(convertServer("claude", { command: "node", cwd: "/srv" })).toEqual({ command: "node", args: [] });
  });

  it("rejects entries with neither command nor url", () => {
    expect(() => convertServer("cursor", { type: "stdio" })).toThrow();
  });
});
