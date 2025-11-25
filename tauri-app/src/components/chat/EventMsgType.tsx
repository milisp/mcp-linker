import React from 'react';
import type { CodexEvent } from "@/types/chat";

interface EventMsgTypeProps {
  msgType: CodexEvent['payload']['params']['msg']['type'];
}

export const EventMsgType: React.FC<EventMsgTypeProps> = ({ msgType }) => {
  if (
    import.meta.env.VITE_SHOW_EVENT_FOOTER === "true" &&
    !["token_count", "exec_command_output_delta"].includes(msgType) &&
    !msgType.startsWith("item_")
  ) {
    return <p className="text-xs text-muted-foreground">{msgType}</p>;
  }
  return null;
};