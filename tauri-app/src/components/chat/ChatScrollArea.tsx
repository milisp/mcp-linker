import {
  EVENT_FILTER_OPTIONS,
  EventItem,
  type EventFilterType,
} from "@/components/events/EventItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatScroll } from "@/hooks/codex/useChatScroll";
import type { CodexEvent } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ScrollButtons } from "./actions/ScrollButtons";
import BouncingDotsLoader from "./BouncingDotsLoader";
import { EventFilterPopover } from "./EventFilterPopover";
import { EventMsgType } from "./EventMsgType";

// Build a stable key for React list rendering. Avoid index-based keys.
const getEventKey = (event: CodexEvent): string => {
  const { id, msg } = event.payload.params;

  if (event.meta?.streamKey) {
    const startedAt = event.meta.streamStartedAt ?? "pending";
    return `${event.meta.streamKey}-${startedAt}`;
  }

  if ("item_id" in msg) {
    return `${msg.item_id}-${msg.type}`;
  }

  if ("call_id" in msg) {
    return `${msg.call_id}-${msg.type}`;
  }

  // Fallback: include event id and turn id to ensure stability
  return `${event.id}-${id}-${msg.type}`;
};

const FILTERABLE_EVENT_TYPE_SET = new Set<EventFilterType>(
  EVENT_FILTER_OPTIONS.map((option) => option.type),
);

const getDefaultEventFilters = () =>
  new Set<EventFilterType>(EVENT_FILTER_OPTIONS.map((option) => option.type));

const isFilterableEventType = (type: string): type is EventFilterType =>
  FILTERABLE_EVENT_TYPE_SET.has(type as EventFilterType);

interface ChatScrollAreaProps {
  events: CodexEvent[];
  activeConversationId?: string;
  isResumingConversation?: boolean;
  isBusy?: boolean;
}

export function ChatScrollArea({
  events,
  activeConversationId,
  isResumingConversation = false,
  isBusy = false,
}: ChatScrollAreaProps) {
  const {
    scrollContentRef,
    scrollToBottom,
    scrollToTop,
    isAutoScrollEnabled,
    elapsedLabel,
  } = useChatScroll({
    activeConversationId,
  });

  const [activeFilters, setActiveFilters] = useState(getDefaultEventFilters);
  const toggleEventFilter = (type: EventFilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Sort by numeric turn id (params.id is an increasing string).
  // Within the same turn id, keep original insertion order to avoid jitter.
  const sortedEvents = useMemo(() => {
    const priority = (t: string): number => {
      if (t === "task_started") return 0;
      if (t === "user_message") return 1;
      if (t === "task_complete") return 100;
      return 10;
    };

    return events
      .map((e, i) => ({ e, i }))
      .sort((a, b) => {
        const aPersisted = a.e.meta?.persisted ?? false;
        const bPersisted = b.e.meta?.persisted ?? false;
        if (aPersisted !== bPersisted) {
          return aPersisted ? -1 : 1;
        }

        const aid = Number(a.e.payload.params.id);
        const bid = Number(b.e.payload.params.id);
        const aNum = Number.isFinite(aid);
        const bNum = Number.isFinite(bid);
        if (aNum && bNum && aid !== bid) return aid - bid;
        if (!aNum || !bNum) {
          const as = a.e.payload.params.id ?? "";
          const bs = b.e.payload.params.id ?? "";
          if (as !== bs) return as.localeCompare(bs);
        }
        const at = a.e.payload.params.msg.type;
        const bt = b.e.payload.params.msg.type;
        const ap = priority(at);
        const bp = priority(bt);
        if (ap !== bp) return ap - bp;
        // Stable within the same turn
        return a.i - b.i;
      })
      .map(({ e }) => e);
  }, [events]);

  const visibleEvents = useMemo(() => {
    return sortedEvents.filter((e) => {
      const t = e.payload.params.msg.type;
      if (DELTA_EVENT_TYPES.has(t)) return false;
      if (t === "exec_command_output_delta") return false;
      if (t === "item_started" || t === "item_completed") return false;
      if (isFilterableEventType(t) && !activeFilters.has(t)) return false;
      return true;
    });
  }, [sortedEvents, activeFilters]);

  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    scrollToBottom();
  }, [events.length, isAutoScrollEnabled, scrollToBottom]);

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div ref={scrollContentRef} className="space-y-4 p-4">
          {visibleEvents.map((event, index) => {
            const { conversationId, msg } = event.payload.params;
            const key = `${getEventKey(event)}-${index}`;
            return (
              <div key={key} className="space-y-1">
                <EventItem event={event} conversationId={conversationId} />
                <EventMsgType msgType={msg.type} />
              </div>
            );
          })}

          {isBusy && !isResumingConversation && (
            <BouncingDotsLoader
              elapsedLabel={elapsedLabel}
              conversationId={activeConversationId}
            />
          )}
        </div>
      </ScrollArea>
      <EventFilterPopover
        activeFilters={activeFilters}
        toggleEventFilter={toggleEventFilter}
      />
      <ScrollButtons
        scrollToTop={scrollToTop}
        scrollToBottom={scrollToBottom}
      />
      {isResumingConversation && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/70">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background/90 px-4 py-3 text-sm font-medium text-foreground shadow-lg backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Resuming conversation…</span>
          </div>
        </div>
      )}
    </div>
  );
}
