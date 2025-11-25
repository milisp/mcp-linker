import { CodexEvent } from "@/types/chat";

export const getStreamDurationLabel = (event: CodexEvent): string | null => {
  const durationMs = event.meta?.streamDurationMs;
  if (durationMs === undefined) {
    return null;
  }

  if (durationMs <= 0) {
    return "Stream duration: <0.01s";
  }

  const seconds = durationMs / 1000;
  const formatted =
    seconds >= 10
      ? `${seconds.toFixed(1)}s`
      : seconds >= 1
        ? `${seconds.toFixed(2)}s`
        : `${durationMs.toFixed(0)}ms`;

  return formatted;
};
