import { requiresConfigFile } from "@/lib/clients";
import { open } from "@tauri-apps/plugin-dialog";

/** Asks for the config file when the client needs one (custom), otherwise for a project folder. */
export async function pickClientPath(client: string): Promise<string | null> {
  const picked = requiresConfigFile(client)
    ? await open({ multiple: false, filters: [{ name: "MCP config", extensions: ["json"] }] })
    : await open({ directory: true, multiple: false });
  return typeof picked === "string" ? picked : null;
}
