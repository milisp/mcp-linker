import { create } from "zustand";
import type { EventMsg } from "@/bindings/EventMsg";
import type { TurnItem } from "@/bindings/TurnItem";
import {
  CodexEvent,
  DELTA_EVENT_TYPES,
  type EventMeta,
} from "@/types/chat";

type StreamKey = string;

interface ConversationStreamState {
  reasoningItemId?: string;
  agentMessageItemId?: string;
  eventIndexByStreamKey: Record<StreamKey, number>;
  streamStartTimeByKey: Record<StreamKey, number>;
}

interface EventState {
  events: Record<string, CodexEvent[]>;
  streamState: Record<string, ConversationStreamState>;
  addEvent: (conversationId: string, event: CodexEvent) => void;
  setEvents: (conversationId: string, newEvents: CodexEvent[]) => void;
  clearEvents: (conversationId: string) => void;
}

const createStreamState = (): ConversationStreamState => ({
  eventIndexByStreamKey: {},
  streamStartTimeByKey: {},
});

const cloneStreamState = (
  state: ConversationStreamState,
): ConversationStreamState => ({
  reasoningItemId: state.reasoningItemId,
  agentMessageItemId: state.agentMessageItemId,
  eventIndexByStreamKey: { ...state.eventIndexByStreamKey },
  streamStartTimeByKey: { ...state.streamStartTimeByKey },
});

const DELTA_TO_BASE_MAP: Partial<Record<EventMsg["type"], EventMsg["type"]>> = {
  agent_message_delta: "agent_message",
  agent_reasoning_delta: "agent_reasoning",
  agent_reasoning_raw_content_delta: "agent_reasoning_raw_content",
  reasoning_content_delta: "agent_reasoning",
  reasoning_raw_content_delta: "agent_reasoning_raw_content",
};

const BASE_STREAM_TYPES = new Set<EventMsg["type"]>([
  "agent_message",
  "agent_reasoning",
  "agent_reasoning_raw_content",
]);

const getStreamKey = (
  msg: EventMsg,
  streamState: ConversationStreamState,
  typeOverride?: EventMsg["type"],
): string | null => {
  const type = typeOverride ?? msg.type;
  switch (type) {
    case "agent_message":
    case "agent_message_delta":
      return streamState.agentMessageItemId
        ? `agent_message:${streamState.agentMessageItemId}`
        : null;
    case "agent_reasoning":
    case "agent_reasoning_delta":
    case "agent_reasoning_raw_content":
    case "agent_reasoning_raw_content_delta":
      return streamState.reasoningItemId
        ? `agent_reasoning:${streamState.reasoningItemId}`
        : null;
    case "agent_message_content_delta":
      return "item_id" in msg
        ? `agent_message_content:${msg.item_id}`
        : null;
    case "reasoning_content_delta":
      return "item_id" in msg ? `reasoning_content:${msg.item_id}` : null;
    case "reasoning_raw_content_delta":
      return "item_id" in msg
        ? `reasoning_raw_content:${msg.item_id}`
        : null;
    default:
      return null;
  }
};

const updateStreamStateForItemStarted = (
  item: TurnItem,
  streamState: ConversationStreamState,
) => {
  if (item.type === "Reasoning") {
    const reasoningId = item.id;
    streamState.reasoningItemId = reasoningId;
    delete streamState.eventIndexByStreamKey[`agent_reasoning:${reasoningId}`];
    delete streamState.streamStartTimeByKey[`agent_reasoning:${reasoningId}`];
    delete streamState.streamStartTimeByKey[
      `agent_reasoning_raw_content:${reasoningId}`
    ];
    delete streamState.streamStartTimeByKey[
      `reasoning_content:${reasoningId}`
    ];
    delete streamState.streamStartTimeByKey[
      `reasoning_raw_content:${reasoningId}`
    ];
  } else if (item.type === "AgentMessage") {
    const agentMessageId = item.id;
    streamState.agentMessageItemId = agentMessageId;
    delete streamState.eventIndexByStreamKey[
      `agent_message:${agentMessageId}`
    ];
    delete streamState.streamStartTimeByKey[
      `agent_message:${agentMessageId}`
    ];
    delete streamState.streamStartTimeByKey[
      `agent_message_content:${agentMessageId}`
    ];
  }
};

const updateStreamStateForItemCompleted = (
  _item: TurnItem,
  _streamState: ConversationStreamState,
) => {
  // Intentionally left blank. We keep stream associations alive until the next
  // item starts so that late-arriving base events can still replace the
  // streaming placeholder created from deltas.
};

const applyStreamingDelta = (
  events: CodexEvent[],
  streamState: ConversationStreamState,
  event: CodexEvent,
) => {
  const deltaMsg = event.payload.params.msg;
  const baseType = DELTA_TO_BASE_MAP[deltaMsg.type];
  const targetType = baseType ?? deltaMsg.type;
  const streamKey = getStreamKey(deltaMsg, streamState, targetType);

  const nextEvents = [...events];
  const nextStreamState = cloneStreamState(streamState);

  const now = Date.now();
  if (streamKey) {
    nextStreamState.streamStartTimeByKey[streamKey] ??= now;
  }
  const startTime = streamKey
    ? nextStreamState.streamStartTimeByKey[streamKey]
    : undefined;

  if (!("delta" in deltaMsg) || typeof deltaMsg.delta !== "string") {
    nextEvents.push(event);
    return { events: nextEvents, streamState: nextStreamState };
  }

  const mergeInto = (existingEvent?: CodexEvent): CodexEvent => {
    const existingMsg = existingEvent?.payload.params.msg;
    const previousContent = (() => {
      if (!existingMsg) return "";
      if (existingMsg.type === "agent_message") return existingMsg.message;
      if (existingMsg.type === "agent_reasoning") return existingMsg.text;
      if (existingMsg.type === "agent_reasoning_raw_content")
        return existingMsg.text;
      if ("delta" in existingMsg && typeof existingMsg.delta === "string") {
        return existingMsg.delta;
      }
      return "";
    })();

    const mergedContent = `${previousContent}${deltaMsg.delta}`;

    let mergedMsg: EventMsg;
    switch (targetType) {
      case "agent_message":
        mergedMsg = {
          type: "agent_message",
          message: mergedContent,
        } as Extract<EventMsg, { type: "agent_message" }>;
        break;
      case "agent_reasoning":
        mergedMsg = {
          type: "agent_reasoning",
          text: mergedContent,
        } as Extract<EventMsg, { type: "agent_reasoning" }>;
        break;
      case "agent_reasoning_raw_content":
        mergedMsg = {
          type: "agent_reasoning_raw_content",
          text: mergedContent,
        } as Extract<EventMsg, { type: "agent_reasoning_raw_content" }>;
        break;
      case "agent_message_content_delta":
      case "reasoning_content_delta":
      case "reasoning_raw_content_delta":
        mergedMsg = {
          ...(deltaMsg as Record<string, unknown>),
          type: targetType,
          delta: mergedContent,
        } as EventMsg;
        break;
      default:
        mergedMsg = {
          ...(deltaMsg as Record<string, unknown>),
          type: targetType,
          delta: mergedContent,
        } as EventMsg;
        break;
    }

    const sourceEvent = existingEvent ?? event;
    return {
      ...sourceEvent,
      payload: {
        ...sourceEvent.payload,
        method: `codex/event/${mergedMsg.type}`,
        params: {
          ...sourceEvent.payload.params,
          msg: mergedMsg,
        },
      },
    };
  };

  const withStreamMeta = (
    updatedEvent: CodexEvent,
    existingEvent?: CodexEvent,
  ): CodexEvent => {
    if (!streamKey) {
      return updatedEvent;
    }

    const existingMeta = existingEvent?.meta ?? updatedEvent.meta ?? {};
    const nextMeta: EventMeta = {
      ...existingMeta,
      streamKey,
      streamStartedAt: startTime,
    };

    return {
      ...updatedEvent,
      meta: nextMeta,
    };
  };

  if (streamKey) {
    const existingIndex = nextStreamState.eventIndexByStreamKey[streamKey];
    if (existingIndex !== undefined) {
      const merged = mergeInto(nextEvents[existingIndex]);
      nextEvents[existingIndex] = withStreamMeta(merged, nextEvents[existingIndex]);
    } else {
      const newIndex = nextEvents.length;
      const merged = withStreamMeta(mergeInto());
      nextEvents.push(merged);
      nextStreamState.eventIndexByStreamKey[streamKey] = newIndex;
    }
  } else {
    nextEvents.push(mergeInto());
  }

  return { events: nextEvents, streamState: nextStreamState };
};

const applyBaseEvent = (
  events: CodexEvent[],
  streamState: ConversationStreamState,
  event: CodexEvent,
) => {
  const msg = event.payload.params.msg;
  const streamKey = getStreamKey(msg, streamState, msg.type);

  const nextEvents = [...events];
  const nextStreamState = cloneStreamState(streamState);

  const enrichWithDuration = (
    targetEvent: CodexEvent,
    existingEvent?: CodexEvent,
  ): CodexEvent => {
    if (!streamKey) {
      return targetEvent;
    }

    const startedAt =
      nextStreamState.streamStartTimeByKey[streamKey] ??
      existingEvent?.meta?.streamStartedAt;
    const durationMs =
      startedAt !== undefined ? Math.max(Date.now() - startedAt, 0) : undefined;

    const baseMeta = existingEvent?.meta ?? targetEvent.meta ?? {};
    const nextMeta: EventMeta = {
      ...baseMeta,
      streamKey,
      streamStartedAt: startedAt,
      streamDurationMs: durationMs,
    };

    delete nextStreamState.streamStartTimeByKey[streamKey];

    return {
      ...targetEvent,
      meta: nextMeta,
    };
  };

  if (streamKey) {
    const existingIndex = nextStreamState.eventIndexByStreamKey[streamKey];
    if (existingIndex !== undefined) {
      nextEvents[existingIndex] = enrichWithDuration(
        event,
        nextEvents[existingIndex],
      );
    } else {
      const newIndex = nextEvents.length;
      nextEvents.push(enrichWithDuration(event));
      nextStreamState.eventIndexByStreamKey[streamKey] = newIndex;
    }
  } else {
    nextEvents.push(event);
  }

  return { events: nextEvents, streamState: nextStreamState };
};

const processEvent = (
  currentEvents: CodexEvent[],
  streamState: ConversationStreamState,
  event: CodexEvent,
) => {
  const msg = event.payload.params.msg;
  const nextStreamState = cloneStreamState(streamState);

  if (msg.type === "item_started" && "item" in msg) {
    updateStreamStateForItemStarted(msg.item as TurnItem, nextStreamState);
    return {
      events: [...currentEvents, event],
      streamState: nextStreamState,
    };
  }

  if (msg.type === "item_completed" && "item" in msg) {
    updateStreamStateForItemCompleted(msg.item as TurnItem, nextStreamState);
    return {
      events: [...currentEvents, event],
      streamState: nextStreamState,
    };
  }

  if (DELTA_EVENT_TYPES.has(msg.type)) {
    return applyStreamingDelta(currentEvents, nextStreamState, event);
  }

  if (BASE_STREAM_TYPES.has(msg.type)) {
    return applyBaseEvent(currentEvents, nextStreamState, event);
  }

  return {
    events: [...currentEvents, event],
    streamState: nextStreamState,
  };
};

export const useEventStore = create<EventState>((set) => ({
  events: {},
  streamState: {},
  addEvent: (conversationId, event) => {
    set((state) => {
      const currentEvents = state.events[conversationId] || [];
      const currentStreamState =
        state.streamState[conversationId] || createStreamState();

      const { events, streamState } = processEvent(
        currentEvents,
        currentStreamState,
        event,
      );

      return {
        events: {
          ...state.events,
          [conversationId]: events,
        },
        streamState: {
          ...state.streamState,
          [conversationId]: streamState,
        },
      };
    });
  },
  setEvents: (conversationId, newEvents) =>
    set((state) => ({
      events: {
        ...state.events,
        [conversationId]: [...newEvents],
      },
      streamState: {
        ...state.streamState,
        [conversationId]: createStreamState(),
      },
    })),
  clearEvents: (conversationId) =>
    set((state) => {
      const events = { ...state.events };
      const streamState = { ...state.streamState };
      delete events[conversationId];
      delete streamState[conversationId];
      return { events, streamState };
    }),
}));
