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
  const { hasPaidTier } = useTier();

  function handleChange(value: string) {
    // Block selection for non-paid clients (except claude) unless in dev mode
    const isBlocked = !hasPaidTier && value !== "claude" && !import.meta.env.DEV;
    if (isBlocked) {
      return; // Don't change selection
    }

    // Allow claude_code to work like other clients in Manage without forcing navigation.
    // The dedicated page remains available at /claude-code-manage if users open it explicitly.
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
            // Show upgrade button for non-claude clients when on free tier
            const needsUpgrade = !hasPaidTier && option.value !== "claude" && !import.meta.env.DEV;

            if (needsUpgrade) {
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
