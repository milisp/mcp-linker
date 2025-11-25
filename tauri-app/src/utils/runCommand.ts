import { invoke } from "@tauri-apps/api/core";

export const runCommand = async (conversationId: string, cwd: string) => {
  const cmd = `codex resume ${conversationId}`;
  try {
    await invoke("open_terminal_with_command", { command: cmd, cwd: cwd });
  } catch (err) {
    console.error("Failed to open terminal:", err);
  }
};
