import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTier } from "@/hooks/useTier";
import { useGlobalDialogStore } from "@/stores/globalDialogStore";

interface ServerStatusSwitchProps {
  serverName: string;
  isActive: boolean;
  onEnable: (serverName: string) => Promise<void>;
  onDisable: (serverName: string) => Promise<void>;
}

export function ServerStatusSwitch({
  serverName,
  isActive,
  onEnable,
  onDisable,
}: ServerStatusSwitchProps) {
  const { hasMinimumTier } = useTier();
  const showGlobalDialog = useGlobalDialogStore((s) => s.showDialog);

  // Enable/disable servers instantly requires LIFETIME or higher
  const canToggle = hasMinimumTier("LIFETIME") || import.meta.env.DEV;

  const handleChange = (checked: boolean) => {
    if (!canToggle) {
      showGlobalDialog("upgrade");
      return;
    }

    if (checked) {
      onEnable(serverName);
    } else {
      onDisable(serverName);
    }
  };

  if (!canToggle) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Switch
                checked={isActive}
                disabled={true}
                className="data-[state=checked]:bg-green-600 opacity-50 cursor-not-allowed"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to Lifetime Basic or higher to enable/disable servers instantly</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center">
      <Switch
        checked={isActive}
        onCheckedChange={handleChange}
        className="data-[state=checked]:bg-green-600"
      />
    </div>
  );
}
