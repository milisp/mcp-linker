import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientOptions } from "@/constants/clients";
import { useTier } from "@/hooks/useTier";
import { useConfigScopeStore } from "@/stores";
import { useClientPathStore } from "@/stores/clientPathStore";
import { UpgradePlanButton } from "../common/UpgradePlanButton";

export function ClientSelector() {
  const { selectedClient, setSelectedClient } = useClientPathStore();
  const { canAccessClient } = useTier();

  function handleChange(value: string) {
    // Skip access check for 'custom' option
    if (value === "custom") {
      setSelectedClient(value);
      return;
    }

    // Find the client option to check required tier
    const clientOption = clientOptions.find(opt => opt.value === value);

    // Block selection if user doesn't have required tier (unless in dev mode)
    if (clientOption && clientOption.requiredTier && !canAccessClient(clientOption.requiredTier) && !import.meta.env.DEV) {
      return; // Don't change selection
    }

    setSelectedClient(value);
  }

  return (
    <div className="z-50">
      <Select value={selectedClient} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clientOptions.map((option) => {
            // Skip tier check for 'custom' option
            if (option.value === "custom") {
              return (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              );
            }

            // Check if user can access this client (bypass in dev mode)
            const canAccess = !option.requiredTier || canAccessClient(option.requiredTier) || import.meta.env.DEV;

            if (!canAccess) {
              // Custom rendering for locked items with clickable upgrade button
              return (
                <div
                  key={option.value}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm opacity-60 hover:bg-accent/50"
                >
                  <span>{option.label}</span>
                  <UpgradePlanButton />
                </div>
              );
            }

            return (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

const configScopes = [
  { label: "Personal", value: "personal" },
  { label: "Team", value: "team" },
];

export function ConfigScopeSelector() {
  const { scope, setScope } = useConfigScopeStore();

  return (
    <div className="z-50">
      <Select value={scope} onValueChange={setScope}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          {configScopes.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
