import claudeIcon from "@/assets/icons/claude-color.svg";
import claudeCodeIcon from "@/assets/icons/claudecode-color.svg";
import clineIcon from "@/assets/icons/cline.svg";
import codexIcon from "@/assets/icons/codex-color.svg";
import cursorIcon from "@/assets/icons/cursor.svg";
import copilotIcon from "@/assets/icons/github-copilot.svg";
import { cn } from "@/lib/utils";

const clientIcons: Record<string, string> = {
  claude: claudeIcon,
  claude_code: claudeCodeIcon,
  cline: clineIcon,
  codex: codexIcon,
  cursor: cursorIcon,
  copilot: copilotIcon,
  copilot_cli: copilotIcon,
};

/** Decorative client logo; renders nothing for clients without one. */
export function ClientIcon({ client, className }: { client: string; className?: string }) {
  const src = clientIcons[client];
  if (!src) return null;
  return <img src={src} alt="" aria-hidden="true" className={cn("size-4 shrink-0 object-contain", className)} />;
}
