import { useMemo } from "react";
import * as Diff from "diff";

interface DiffViewerProps {
  original?: string;
  current?: string;
  unifiedDiff?: string;
  fileName?: string;
}

interface DiffLine {
  type: "add" | "remove" | "normal";
  content: string;
  lineNumber: {
    old?: number;
    new?: number;
  };
}

export function DiffViewer({
  original = "",
  current = "",
  unifiedDiff,
}: DiffViewerProps) {
  // If unifiedDiff is provided, approximate split to left/right
  const { left, right } = useMemo(() => {
    if (!unifiedDiff) return { left: original, right: current };
    const stripFences = (s: string) => s.replace(/^```diff\n?|```$/g, "");
    const raw = stripFences(unifiedDiff || "");
    const lines = raw.split("\n");
    const orig: string[] = [];
    const curr: string[] = [];
    for (const line of lines) {
      if (
        line.startsWith("--- ") ||
        line.startsWith("+++ ") ||
        line.startsWith("@@") ||
        line.startsWith("diff --git") ||
        line.startsWith("index ")
      )
        continue;
      if (line.startsWith("+")) {
        curr.push(line.slice(1));
        continue;
      }
      if (line.startsWith("-")) {
        orig.push(line.slice(1));
        continue;
      }
      const ctx = line.startsWith(" ") ? line.slice(1) : line;
      orig.push(ctx);
      curr.push(ctx);
    }
    return { left: orig.join("\n"), right: curr.join("\n") };
  }, [unifiedDiff, original, current]);

  const diffLines = useMemo(() => {
    const changes = Diff.diffLines(left, right);
    const result: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach((change: Diff.Change) => {
      const lines = change.value.split("\n");
      // Remove last empty line if it exists
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      lines.forEach((line) => {
        if (change.added) {
          result.push({
            type: "add",
            content: line,
            lineNumber: { new: newLineNum++ },
          });
        } else if (change.removed) {
          result.push({
            type: "remove",
            content: line,
            lineNumber: { old: oldLineNum++ },
          });
        } else {
          result.push({
            type: "normal",
            content: line,
            lineNumber: { old: oldLineNum++, new: newLineNum++ },
          });
        }
      });
    });

    return result;
  }, [left, right]);

  return (
    <div className="diff-viewer flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="diff-content flex-1 overflow-auto font-mono text-sm">
        <table className="w-full table-fixed">
          <tbody>
            {diffLines.map((line, index) => (
              <tr
                key={index}
                className={`leading-relaxed hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                  line.type === "add"
                    ? "bg-green-50/30 dark:bg-green-900/20"
                    : line.type === "remove"
                      ? "bg-red-50/30 dark:bg-red-900/20"
                      : ""
                }`}
              >
                {/* Change indicator */}
                <td
                  className={`w-6 min-w-6 text-center border-r border-gray-200 dark:border-gray-700 select-none text-sm font-medium py-1 ${
                    line.type === "add"
                      ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                      : line.type === "remove"
                        ? "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {line.type === "add"
                    ? "+"
                    : line.type === "remove"
                      ? "−"
                      : ""}
                </td>

                {/* Content */}
                <td
                  className={`whitespace-pre text-sm text-gray-900 dark:text-gray-100 ${
                    line.type === "add"
                      ? "bg-green-50/80 dark:bg-green-900/30"
                      : line.type === "remove"
                        ? "bg-red-50/80 dark:bg-red-900/30"
                        : "bg-white dark:bg-gray-900"
                  }`}
                >
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
