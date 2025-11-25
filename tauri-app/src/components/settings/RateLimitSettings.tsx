import { useCallback, useEffect, useMemo, useState } from "react";

import type { GetAccountRateLimitsResponse } from "@/bindings/v2/GetAccountRateLimitsResponse";
import type { RateLimitWindow } from "@/bindings/v2/RateLimitWindow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/core";

function formatTimestamp(timestamp: number | bigint | null) {
  if (timestamp == null) {
    return "Unknown";
  }

  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function renderWindow(window: RateLimitWindow | null, label: string) {
  const usedPercent = window ? Number(window.usedPercent ?? 0) : 0;
  const remainingPercent = Math.max(0, 100 - usedPercent);
  return (
    <div className="rounded-md border border-border/50 bg-background/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {window ? (
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {remainingPercent}% remaining
            </span>
          </div>
          <Progress
            value={remainingPercent}
            className="[&_[data-slot=progress-indicator]]:bg-emerald-500 bg-emerald-100"
          />
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Resets at</span>
              <span>{formatTimestamp(window.resetsAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No rate limit window configured for this tier.
        </p>
      )}
    </div>
  );
}

export function RateLimitSettings() {
  const [rateLimits, setRateLimits] = useState<GetAccountRateLimitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchRateLimits = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await invoke<GetAccountRateLimitsResponse>(
        "get_account_rate_limits",
      );
      setRateLimits(response);
      setLastFetchedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
      setLastError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRateLimits();
  }, [fetchRateLimits]);

  const primaryWindow = rateLimits?.rateLimits.primary ?? null;
  const secondaryWindow = rateLimits?.rateLimits.secondary ?? null;

  const statusText = useMemo(() => {
    if (isLoading) {
      return "Refreshing...";
    }
    if (lastFetchedAt) {
      return `Last updated ${lastFetchedAt.toLocaleTimeString()}`;
    }
    if (lastError) {
      return "Unable to load rate limits";
    }
    return "No data yet";
  }, [isLoading, lastError, lastFetchedAt]);

  return (
    <Card className="max-w-3xl my-6">
      <CardHeader>
        <CardTitle>Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastError && <p className="text-sm text-destructive">{lastError}</p>}
        <div className="space-y-4">
          {renderWindow(primaryWindow, "5 hour usage limit")}
          {renderWindow(secondaryWindow, "Weekly usage limit")}
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        <Button onClick={fetchRateLimits} disabled={isLoading}>
          {isLoading ? "Refreshing…" : "Refresh"}
        </Button>
        <span className="text-xs text-muted-foreground">{statusText}</span>
      </CardFooter>
    </Card>
  );
}
