import type { EventMsg } from "@/bindings/EventMsg";

export interface EventMeta {
  streamKey?: string;
  streamStartedAt?: number;
  streamDurationMs?: number;
  persisted?: boolean;
}

export interface CodexEvent {
  id: number;
  event: string; // "codex:event"
  payload: {
    method: string; // e.g. "codex/event/agent_message"
    params: {
      conversationId: string;
      id: string;
      msg: EventMsg;
    };
  };
  meta?: EventMeta;
}

export type ResumeConversationResult = {
  conversationId: string;
  model: string;
  initialMessages?: CodexEvent["payload"]["params"]["msg"][] | null;
};

export const extractInitialMessages = (
  response: ResumeConversationResult,
): CodexEvent["payload"]["params"]["msg"][] | null => {
  return response.initialMessages ?? null;
};

// dont need exec_command_output_delta
export const DELTA_EVENT_TYPES = new Set<EventMsg["type"]>([
  "agent_message_delta",
  "agent_message_content_delta",
  "agent_reasoning_delta",
  "agent_reasoning_raw_content_delta",
  "reasoning_content_delta",
  "reasoning_raw_content_delta",
]);

export interface MediaAttachment {
  id: string;
  type: "image" | "audio";
  path: string;
  name: string;
  mimeType?: string;
}
