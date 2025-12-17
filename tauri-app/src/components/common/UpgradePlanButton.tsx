import { open } from "@tauri-apps/plugin-shell";
import { Button } from "../ui/button";

export function UpgradePlanButton() {
  return (
    <Button
      onClick={() => {
        open("https://mcp-linker.store/pricing");
      }}
      size="sm"
      variant="secondary"
      className="flex ml-auto text-purple-400 rounded-5"
    >
      + upgrade your plan
    </Button>
  );
}
