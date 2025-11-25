import { Switch } from "../ui/switch";

export const MESSAGE_FILTER_OPTIONS = [
  { type: "agent_message", label: "Agent Messages" },
  { type: "agent_reasoning", label: "Agent Reasoning" },
  { type: "agent_reasoning_raw_content", label: "Raw Agent Reasoning" },
  { type: "exec_command", label: "Execution Commands" },
  { type: "update_plan", label: "Plan Updates" },
  { type: "apply_patch", label: "Patches" },
  { type: "custom_tool_call", label: "Custom Tool Calls" },
  { type: "custom_tool_call_output", label: "Custom Tool Call Outputs" },
];

export const createInitialFilterState = () =>
  MESSAGE_FILTER_OPTIONS.reduce<Record<string, boolean>>((acc, filter) => {
    acc[filter.type] = true;
    return acc;
  }, {});

type ReviewFiltersProps = {
  showFilter: boolean;
  messageTypes: Record<string, boolean>;
  onToggleFilter: () => void;
  onFilterChange: (type: string, checked: boolean) => void;
};

export function ReviewFilters({
  showFilter,
  messageTypes,
  onToggleFilter,
  onFilterChange,
}: ReviewFiltersProps) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Message Filters
        <Switch
          checked={showFilter}
          onCheckedChange={onToggleFilter}
          aria-label="showFilter"
        />
      </p>
      {showFilter && (
        <div className="flex flex-wrap gap-4">
          {MESSAGE_FILTER_OPTIONS.map((filter) => (
            <label
              key={filter.type}
              className="flex items-center gap-2 text-sm text-foreground/80"
            >
              <Switch
                checked={messageTypes[filter.type] ?? true}
                onCheckedChange={(checked) =>
                  onFilterChange(filter.type, checked)
                }
                aria-label={`Toggle filter ${filter.label}`}
              />
              <span>{filter.label}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}
