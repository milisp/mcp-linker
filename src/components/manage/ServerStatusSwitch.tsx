import { Switch } from "@/components/ui/switch";

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
  const handleChange = (checked: boolean) => {
    if (checked) {
      onEnable(serverName);
    } else {
      onDisable(serverName);
    }
  };

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
