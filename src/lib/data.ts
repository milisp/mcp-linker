import { open } from "@tauri-apps/plugin-dialog";

/** Clients that can also use a project's config (`.cursor/mcp.json`, `.vscode/mcp.json`). */
export const projectFolderClients = ["cursor", "copilot"];
/** Clients that point at a config file and have no default location. */
export const mustHavePathClients = ["custom"];
export const needspathClient = [...projectFolderClients, ...mustHavePathClients];

/** Asks for a config file for `custom`, otherwise for a project folder. */
export async function pickClientPath(client: string): Promise<string | null> {
  const picked = mustHavePathClients.includes(client)
    ? await open({ multiple: false, filters: [{ name: "MCP config", extensions: ["json"] }] })
    : await open({ directory: true, multiple: false });
  return typeof picked === "string" ? picked : null;
}
