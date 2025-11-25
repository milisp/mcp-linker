export function describeParsedCommand(
  parsed: {
    type: string;
    cmd: string;
    name?: string | null;
    path?: string | null;
    query?: string | null;
  },
): string {
  switch (parsed.type) {
    case "read":
      return parsed.name ? `read ${parsed.name}` : parsed.cmd;
    case "list_files":
      return parsed.path ? `list ${parsed.path}` : parsed.cmd;
    case "search":
      return parsed.query ? `search "${parsed.query}"` : parsed.cmd;
    default:
      return parsed.cmd;
  }
}

export function describeFileChange(
  change: unknown,
): { label: string; detail?: string } {
  if (typeof change !== "object" || change === null) {
    return { label: "Change" };
  }

  if ("add" in change) {
    const add = (change as { add?: unknown }).add;
    if (add) {
      return { label: "Add" };
    }
  }

  if ("delete" in change) {
    const del = (change as { delete?: unknown }).delete;
    if (del) {
      return { label: "Delete" };
    }
  }

  if ("update" in change) {
    const update = (change as { update?: { move_path?: unknown } }).update;
    const movePath =
      update && typeof update.move_path === "string" ? update.move_path : null;
    return {
      label: "Update",
      detail: movePath ? `moved to ${movePath}` : undefined,
    };
  }

  return { label: "Change" };
}

export function formatAbortReason(reason: string): string {
  switch (reason) {
    case "interrupted":
      return "The turn was interrupted by the user.";
    case "replaced":
      return "A newer turn replaced the current one.";
    case "review_ended":
      return "Review mode ended the current turn.";
    default:
      return "The turn ended early.";
  }
}
