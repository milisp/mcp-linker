import { open } from "@tauri-apps/plugin-shell";
import { Button } from "../ui/button";

export function ConfigTip() {
  return (
    <Button
      onClick={() =>
        open("https://github.com/milisp/codexia/blob/main/docs/config.toml")
      }
    >
      online ~/.codex/config.toml example
    </Button>
  );
}
