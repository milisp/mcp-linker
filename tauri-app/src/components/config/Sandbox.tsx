import React, { useState } from "react";
import { Bot, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  APPROVAL_POLICIES,
  SANDBOX_MODES,
  MODE_OPTIONS,
} from "@/components/config/ConversationParams";
import { useSandboxStore } from "@/stores";

export const Sandbox: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { mode, approvalPolicy, setMode, setApprovalPolicy } =
    useSandboxStore();
  const currentSelectorLabel =
    MODE_OPTIONS.find((option) => option.value === mode)?.selectorLabel ||
    mode.toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-1">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">{currentSelectorLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[520px] p-4">
        <div className="grid grid-cols-[120px_1fr_1fr] gap-4">
          {/* Mode Section */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mode
            </p>
            <div className="flex flex-col gap-2">
              {MODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={mode === option.value ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => {
                    setMode(option.value);
                  }}
                >
                  {option.selectorLabel}
                </Button>
              ))}
            </div>
          </div>

          {/* Sandbox Info (read-only visualization) */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sandbox
            </p>
            <TooltipProvider>
              <div className="space-y-2">
                {MODE_OPTIONS.map((option) => (
                  <Tooltip key={option.value}>
                    <TooltipTrigger asChild>
                      <div
                        className={`rounded-md border p-3 text-sm transition-colors ${
                          mode === option.value
                            ? "border-primary bg-accent/40"
                            : "border-border"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {SANDBOX_MODES[option.value].label}
                        </div>
                      </div>
                    </TooltipTrigger>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Approval Policy Section */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Approval
            </p>
            <div className="grid grid-cols-1 gap-2">
              {APPROVAL_POLICIES.map((policy) => (
                <Button
                  key={policy}
                  size="sm"
                  variant={policy === approvalPolicy ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => {
                    setApprovalPolicy(policy);
                  }}
                >
                  {policy}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
