import type { SessionSource } from "@/bindings/SessionSource";

export function formatSessionSource(source: SessionSource) {
  if (typeof source === "string") {
    return source;
  }

  const { subagent } = source;
  if (typeof subagent === "string") {
    return `subagent:${subagent}`;
  }

  return `subagent:${subagent.other}`;
}
