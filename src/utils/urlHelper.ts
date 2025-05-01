// utils/urlHelper.ts
import { open } from "@tauri-apps/plugin-shell";

export function openUrl(url: string, branch = "main") {
  if (url.includes("github.com") && url.includes("modelcontextprotocol")) {
    const parts = url.split("/src/");
    const baseUrl = parts[0];
    const path = parts[1] ? `/src/${parts[1]}` : "";
    url = `${baseUrl}/tree/${branch}${path}`;
  }
  open(url);
}
