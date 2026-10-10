import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientOptions } from "@/constants/clients";
import { useClientPathStore } from "@/stores/clientPathStore";
import claudeIcon from "@/assets/icons/claude-color.svg";
import claudeCodeIcon from "@/assets/icons/claudecode-color.svg";
import clineIcon from "@/assets/icons/cline.svg";
import codexIcon from "@/assets/icons/codex-color.svg";
import cursorIcon from "@/assets/icons/cursor.svg";
import copilotIcon from "@/assets/icons/github-copilot.svg";

const clientIcons: Record<string, string> = {
  claude: claudeIcon,
  claude_code: claudeCodeIcon,
  cline: clineIcon,
  codex: codexIcon,
  cursor: cursorIcon,
  copilot: copilotIcon,
};

export function ClientSelector() {
  const { selectedClient, setSelectedClient } = useClientPathStore();

  return (
    <div className="z-50">
      <Select value={selectedClient} onValueChange={setSelectedClient}>
        <SelectTrigger className="h-8 w-full text-xs" aria-label="Target client">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clientOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} textValue={option.label}>
              {clientIcons[option.value] && (
                <img
                  src={clientIcons[option.value]}
                  alt=""
                  aria-hidden="true"
                  className="size-4 shrink-0 object-contain"
                />
              )}
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

