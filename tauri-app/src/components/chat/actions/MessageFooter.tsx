import { useMemo, useState } from "react";
import { Check, Copy, GitFork, Pencil, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { MessageNoteActions } from "./MessageNoteActions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageFooterProps {
  messageId: string;
  messageContent: string;
  messageRole: "user" | "assistant" | string;
  timestamp?: number;
  selectedText?: string;
  messageType?: "reasoning" | "tool_call" | "plan_update" | "exec_command" | "normal";
  eventType?: string;
  onFork?: () => void;
  onEdit?: () => void;
  align?: "start" | "end";
  className?: string;
}

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (isSameDay) {
    return time;
  }
  const day = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${day} · ${time}`;
};

const MetaBadge = ({ label }: { label: string }) => (
  <span className="rounded border border-border/50 bg-background/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/80">
    {label.replace(/_/g, " ")}
  </span>
);

export function MessageFooter({
  messageId,
  messageContent,
  messageRole,
  timestamp,
  selectedText = "",
  messageType,
  eventType,
  onFork,
  onEdit,
  align = "start",
  className,
}: MessageFooterProps) {
  const [copied, setCopied] = useState(false);

  const formattedTime = useMemo(() => formatTimestamp(timestamp), [timestamp]);
  const displayType = useMemo(() => {
    if (messageType && messageType !== "normal") {
      return messageType;
    }
    return null;
  }, [messageType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const renderAction = (
    icon: React.ReactNode,
    label: string,
    onClick: (() => void) | undefined,
    disabled = false,
  ) => {
    if (!onClick) {
      return null;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground/80 transition-colors hover:border-border hover:bg-background",
              disabled && "pointer-events-none opacity-50",
            )}
            aria-label={label}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex w-full opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100",
          align === "end" ? "justify-end" : "justify-start",
          className,
        )}
      >
        <div
          className={cn(
            "flex items-center gap-4 rounded-md border border-border/40 bg-muted/40 px-3 text-xs text-muted-foreground shadow-sm backdrop-blur-sm",
            align === "end" && "flex-row-reverse",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 whitespace-nowrap text-muted-foreground/80",
              align === "end" && "flex-row-reverse text-right",
            )}
          >
            {formattedTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedTime}
              </span>
            ) : null}
            {displayType ? <MetaBadge label={displayType} /> : null}
            {eventType ? <MetaBadge label={eventType} /> : null}
          </div>
          <div
            className={cn(
              "flex items-center gap-1",
              align === "end" && "flex-row-reverse",
            )}
          >
            {renderAction(
              <Pencil className="h-3.5 w-3.5" />,
              "Edit and resend",
              messageRole === "user" ? onEdit : undefined,
            )}
            {renderAction(
              <GitFork className="h-3.5 w-3.5" />,
              "Fork conversation from here",
              messageRole === "assistant" ? onFork : undefined,
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground/80 transition-colors hover:border-border hover:bg-background"
                  aria-label={copied ? "Message copied" : "Copy message"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied" : "Copy message"}</TooltipContent>
            </Tooltip>
            <MessageNoteActions
              messageId={messageId}
              messageContent={messageContent}
              messageRole={messageRole}
              timestamp={timestamp ?? Date.now()}
              selectedText={selectedText}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
