import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Funnel } from "lucide-react";
import {
  EVENT_FILTER_OPTIONS,
  type EventFilterType,
} from "@/components/events/EventItem";

interface EventFilterPopoverProps {
  activeFilters: Set<EventFilterType>;
  toggleEventFilter: (type: EventFilterType) => void;
}

export function EventFilterPopover({
  activeFilters,
  toggleEventFilter,
}: EventFilterPopoverProps) {
  return (
    <div className="pointer-events-auto absolute right-2 bottom-20 z-30">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shadow-lg"
            aria-label="Filter events"
          >
            <Funnel className="h-4 w-4" />
            <span className="sr-only">Filter events</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Filters
          </p>
          <div className="mt-2 space-y-2">
            {EVENT_FILTER_OPTIONS.map((option) => (
              <label
                key={option.type}
                className="flex items-center justify-between text-sm font-medium text-foreground"
              >
                <span>{option.label}</span>
                <Switch
                  checked={activeFilters.has(option.type)}
                  onCheckedChange={() => toggleEventFilter(option.type)}
                />
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
