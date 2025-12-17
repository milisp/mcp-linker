import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { AccordionMsg } from "@/components/events/AccordionMsg";
import { TurnDiffView } from "@/components/events/TurnDiffView";
import ReviewExecCommandItem from "@/components/review/ReviewExecCommandItem";
import { ReviewPatchOutputIcon } from "@/components/review/ReviewPatchOutputIcon";
import { Badge } from "@/components/ui/badge";
import { useActiveConversationStore } from "@/stores/codex/useActiveConversationStore";
import { readTextFileLines } from "@tauri-apps/plugin-fs";
import { Dot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlanDisplay, SimplePlanStep } from "../chat/messages/PlanDisplay";
import { aggregateMessages } from "./aggregateMessages";
import { ReviewFilters, createInitialFilterState } from "./ReviewFilters";
import { RawMessage } from "./type";

export function Review() {
  const { selectConversation } = useActiveConversationStore();
  const currentPath = selectConversation?.path ?? "";
  const [msgs, setMsgs] = useState<RawMessage[]>([]);
  const [showFilter, setShowFilter] = useState(true);
  const [expandedExecCommands, setExpandedExecCommands] = useState<
    Record<string, boolean>
  >({});
  const [messageTypes, setMessageTypes] = useState(createInitialFilterState);

  useEffect(() => {
    let isMounted = true;
    setMsgs([]);
    setExpandedExecCommands({});
    if (!currentPath) {
      return () => {
        isMounted = false;
      };
    }

    const readConversation = async () => {
      try {
        const lines = await readTextFileLines(currentPath);
        let messages: RawMessage[] = [];
        let payload: Record<string, any> = {};
        for await (const line of lines) {
          if (!line) continue;
          const cleanedLine = line.replace(/\0/g, "");
          if (!cleanedLine.trim()) continue;
          const parsed = JSON.parse(cleanedLine);
          if (!parsed) continue;
          switch (parsed.type) {
            case "session_meta":
              // console.log(parsed);
              break;
            case "event_msg":
              payload = parsed.payload;
              if (payload.type !== "token_count") {
                messages.push(payload);
              }
              break;
            case "response_item":
              payload = parsed.payload;
              if (
                !["message", "reasoning", "ghost_snapshot"].includes(
                  payload.type,
                )
              ) {
                if (
                  ![
                    "function_call",
                    "function_call_output",
                    "custom_tool_call",
                    "custom_tool_call_output",
                  ].includes(payload.type)
                ) {
                  console.log(payload);
                }
                if (payload.type === "function_call") {
                  if (payload.name === "update_plan") {
                    payload.type = "update_plan";
                  } else if (payload.name === "apply_patch") {
                    payload.type = "apply_patch";
                  }
                }

                messages.push(payload);
              }
              break;
            default:
              payload = parsed.payload;
              if (parsed.type !== "turn_context") {
                console.log(payload);
              }
              break;
          }
        }
        if (!isMounted) return;
        setMsgs(aggregateMessages(messages));
      } catch (error) {
        console.error("Failed to read review conversation:", error);
        if (isMounted) {
          setMsgs([]);
        }
      }
    };

    readConversation();

    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  const filteredMessages = useMemo(
    () =>
      msgs.filter((msg) => {
        const type = msg.type ?? "";
        return messageTypes[type] ?? true;
      }),
    [messageTypes, msgs],
  );

  const toggleExecCommand = (id: string) => {
    setExpandedExecCommands((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFilterChange = (type: string, checked: boolean) => {
    setMessageTypes((prev) => ({
      ...prev,
      [type]: checked,
    }));
  };

  if (!currentPath) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-4 text-sm text-muted-foreground">
        Select a conversation to view its review history.
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-2 overflow-auto h-full">
      <div className="flex flex-col gap-2 border-b pb-2">
        <ReviewFilters
          showFilter={showFilter}
          messageTypes={messageTypes}
          onToggleFilter={() => setShowFilter((prev) => !prev)}
          onFilterChange={handleFilterChange}
        />
      </div>
      {filteredMessages.map((msg, index) => {
        switch (msg.type) {
          case "agent_message":
            return (
              <div className="flex w-full" key={`agent-${index}`}>
                <MarkdownRenderer content={msg.message} />
              </div>
            );
          case "user_message":
            return (
              <div key={`user-${index}`} className="flex w-full justify-end">
                <MarkdownRenderer
                  className="px-2 border rounded"
                  content={msg.message}
                />
              </div>
            );

          case "agent_reasoning_raw_content":
          case "agent_reasoning": {
            if (!msg.text.includes("\n")) {
              return (
                <span className="flex items-center gap-2" key={index}>
                  <Dot size={8} />
                  <MarkdownRenderer content={msg.text} />
                </span>
              );
            }
            const firstNewlineIndex = msg.text.indexOf("\n");
            const title = msg.text.substring(0, firstNewlineIndex);
            const content = msg.text.substring(firstNewlineIndex + 1);
            return (
              <span className="flex items-center" key={index}>
                <Dot size={8} />
                <AccordionMsg title={title} content={content} />
              </span>
            );
          }
          case "turn_aborted":
            return (
              <Badge key={index} className="bg-red-200 dark:bg-red-500">
                {msg.reason}
              </Badge>
            );
          case "exec_command": {
            const begin = msg.begin ?? null;
            const end = msg.end ?? null;
            const callId = begin?.call_id ?? end?.call_id ?? `exec-${index}`;
            const isOpen = expandedExecCommands[callId] ?? false;
            return (
              <ReviewExecCommandItem
                key={`${callId}-${index}`}
                begin={begin}
                end={end}
                isOpen={isOpen}
                onToggle={() => toggleExecCommand(callId)}
              />
            );
          }
          case "update_plan":
            let planArgs: { plan: SimplePlanStep[]; explanation: string } =
              JSON.parse(msg.arguments);
            return <PlanDisplay steps={planArgs.plan} />;
          case "apply_patch":
            let applyPatchArgs = JSON.parse(msg.arguments);
            return (
              <div key={index}>
                <TurnDiffView content={applyPatchArgs.input} />
              </div>
            );
          case "custom_tool_call":
            return (
              <div key={index}>
                <TurnDiffView content={msg.input} />
              </div>
            );
          case "custom_tool_call_output":
            return (
              <div key={index}>
                <ReviewPatchOutputIcon patch_output={msg.output} />
              </div>
            );
          case "ghost_snapshot":
            return null;
          default:
            return <code key={index}>{JSON.stringify(msg)}</code>;
        }
      })}
    </div>
  );
}
