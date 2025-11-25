import {
  ChevronDown,
  ChevronUp,
  Copy,
  Minimize2,
  SquareChevronRight,
} from "lucide-react";

type ExecCommandMessage = Record<string, any>;

interface ReviewExecCommandItemProps {
  begin?: ExecCommandMessage | null;
  end?: ExecCommandMessage | null;
  isOpen: boolean;
  onToggle: () => void;
}

const parseBeginArguments = (begin?: ExecCommandMessage | null): unknown => {
  if (!begin?.arguments) {
    return undefined;
  }

  return JSON.parse(begin.arguments);
};

const parseShellCommandParts = (parsedArgs: unknown): string[] => {
  if (!parsedArgs || typeof parsedArgs !== "object") {
    return [];
  }

  const argsRecord = parsedArgs as Record<string, unknown>;
  const commandValue = argsRecord.command;

  if (Array.isArray(commandValue)) {
    return commandValue.filter(
      (entry: unknown): entry is string => typeof entry === "string",
    );
  }

  if (typeof commandValue === "string" && commandValue.trim().length) {
    return [commandValue.trim()];
  }

  return [];
};

const buildCommandTitle = (
  begin: ExecCommandMessage | null | undefined,
  shellCommandParts: string[],
) => {
  const hasMultipleParts =
    shellCommandParts.length >= 2 &&
    ["zsh", "bash"].includes(shellCommandParts[0]);
  const slicedParts = hasMultipleParts
    ? shellCommandParts.slice(2)
    : shellCommandParts;

  if (slicedParts.length) {
    return slicedParts.join(" ");
  }

  if (shellCommandParts.length) {
    return shellCommandParts.join(" ");
  }

  if (begin?.name) {
    return begin.name;
  }

  if (begin?.arguments) {
    return begin.arguments;
  }

  return "";
};

const formatArgumentSummary = (parsedArgs: unknown): string => {
  if (!parsedArgs) {
    return "";
  }

  if (typeof parsedArgs === "string") {
    return parsedArgs;
  }

  if (Array.isArray(parsedArgs)) {
    return parsedArgs.join(" ");
  }

  if (typeof parsedArgs === "object" && parsedArgs !== null) {
    return Object.entries(parsedArgs)
      .map(([key, value]) => {
        const safeValue =
          typeof value === "string"
            ? value
            : value === null || value === undefined
              ? "null"
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);
        return `${key}=${safeValue}`;
      })
      .join(" ");
  }

  return String(parsedArgs);
};

const extractCommandOutput = (end?: ExecCommandMessage | null) => {
  if (!end?.output) {
    return "";
  }

  try {
    const parsed = JSON.parse(end.output);

    if (typeof parsed === "string") {
      return parsed;
    }

    if (Array.isArray(parsed)) {
      return parsed
        .map((chunk) => {
          if (!chunk) return "";
          if (typeof chunk === "string") {
            return chunk;
          }
          if (typeof chunk === "object" && chunk !== null) {
            const chunkRecord = chunk as Record<string, unknown>;
            if (typeof chunkRecord.text === "string") {
              return chunkRecord.text;
            }
          }
          return JSON.stringify(chunk);
        })
        .join("");
    }

    if (typeof parsed === "object" && parsed !== null) {
      const parsedRecord = parsed as Record<string, unknown>;
      if (typeof parsedRecord.output === "string") {
        return parsedRecord.output;
      }
      return JSON.stringify(parsedRecord, null, 2);
    }

    return String(parsed);
  } catch {
    return end.output ?? "";
  }
};

const getCommandHeading = (begin?: ExecCommandMessage | null) => {
  if (begin?.name === "shell" || begin?.name === "shell_command") {
    return "Shell";
  }
  return begin?.name || "Command";
};

export default function ReviewExecCommandItem({
  begin,
  end,
  isOpen,
  onToggle,
}: ReviewExecCommandItemProps) {
  const parsedBeginArguments = parseBeginArguments(begin);
  const commandParts = parseShellCommandParts(parsedBeginArguments);
  const commandTitle = buildCommandTitle(begin, commandParts);
  const commandLabel = commandTitle || "command";
  const commandOutput = extractCommandOutput(end);
  const argumentSummary = formatArgumentSummary(parsedBeginArguments);
  const commandHeading = getCommandHeading(begin);

  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-2 text-left">
        <SquareChevronRight size={10} />
        Ran {commandLabel}
        <button onClick={onToggle}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </span>
      {isOpen && commandOutput && (
        <div className="border">
          <div className="flex justify-between bg-gray-200 dark:bg-gray-800 px-2">
            {commandHeading}
            <span className="flex gap-2">
              <Copy size={16} />
              <Minimize2 size={16} />
            </span>
          </div>
          <div className="flex font-mono text-sm px-2 py-1 bg-black/5 dark:bg-white/5 rounded">
            {commandParts.length
              ? `$ ${commandParts.join(" ")}`
              : argumentSummary || "No args"}
          </div>
          <div className="max-h-24 overflow-auto">
            <pre>
              <code>{commandOutput}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
