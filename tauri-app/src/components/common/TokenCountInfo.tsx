import type { TokenUsage } from "@/bindings/TokenUsage";

interface TokenCountInfoProps {
  usage: TokenUsage | null | undefined;
  className?: string;
}

export function TokenCountInfo({ usage, className }: TokenCountInfoProps) {
  if (!usage || typeof usage.total_tokens !== "number") {
    return null;
  }

  return (
    <span className={"flex items-center gap-3 " + (className ?? "")}>
      <span className="text-sm">
        <span className="font-medium">{usage.total_tokens.toLocaleString()}</span>
        <span className="text-muted-foreground"> tokens</span>
      </span>
    </span>
  );
}
