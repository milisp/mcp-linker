import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProviderDetailsCollapsibleProps {
  selectedProviderId: string | null;
  currentEnvKey: string;
  currentBaseUrl: string;
  handleEnvKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBaseUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProviderDetailsCollapsible({
  selectedProviderId,
  currentEnvKey,
  currentBaseUrl,
  handleEnvKeyChange,
  handleBaseUrlChange,
}: ProviderDetailsCollapsibleProps) {
  const [showProviderDetails, setShowProviderDetails] = useState(false);

  return (
    <Collapsible
      open={showProviderDetails}
      onOpenChange={setShowProviderDetails}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-2 text-xs"
          disabled={!selectedProviderId}
        >
          {showProviderDetails
            ? "Hide additional fields"
            : "Show additional fields"}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              showProviderDetails ? "rotate-180" : ""
            }`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
            env_key
          </Label>
          <Input
            placeholder="e.g., OPENAI_API_KEY"
            value={currentEnvKey}
            onChange={handleEnvKeyChange}
            className="font-mono text-xs"
            disabled={!selectedProviderId}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
            base_url
          </Label>
          <Input
            placeholder="https://api.example.com/v1"
            value={currentBaseUrl}
            onChange={handleBaseUrlChange}
            className="font-mono text-xs"
            disabled={!selectedProviderId}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
