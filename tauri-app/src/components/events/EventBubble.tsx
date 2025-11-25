import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EventVariant = "user" | "assistant" | "system";

const VARIANT_CLASSES: Record<EventVariant, string> = {
  user: "bg-primary text-primary-foreground",
  assistant: "bg-muted text-foreground",
  system: "bg-background text-foreground border border-border",
};

export function EventBubble({
  align,
  variant,
  children,
}: {
  align: "start" | "end";
  variant: EventVariant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-xl rounded-lg px-2 py-2 text-sm shadow-sm",
          VARIANT_CLASSES[variant],
        )}
      >
        {children}
      </div>
    </div>
  );
}
