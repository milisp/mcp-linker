import {
  ChevronDown,
  ChevronUp,
  Copy,
  Minimize2,
  SquareChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";
import { CodexEvent } from "@/types/chat";
import { useExecCommandStore } from "@/stores";

export function ExecCommandBeginItem({ event }: { event: CodexEvent }) {
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen((prev) => !prev);
  const { msg } = event.payload.params;
  if (msg.type !== "exec_command_begin") return null;
  const execCommandStatus = useExecCommandStore((state) => {
    if (msg.type === "exec_command_begin" && "call_id" in msg) {
      return state.statuses[msg.call_id];
    }
    return undefined;
  });

  const statusIcon =
    execCommandStatus && !execCommandStatus.success ? (
      <X className="h-4 w-4 text-destructive" aria-label="Command failed" />
    ) : null;

  return (
    <div>
      <div className="flex w-full font-semibold rounded items-center gap-2">
        <SquareChevronRight size={10} />
        <div className="flex items-center font-semibold transition-colors duration-300">
          <span className="flex-1">{msg.parsed_cmd[0].cmd}</span>
          {statusIcon}
        </div>
        <button onClick={onToggle}>
          {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>
      {isOpen && (
        <div className="border">
          <div className="flex justify-between bg-gray-200 dark:bg-gray-800 px-2">
            Shell
            <span className="flex gap-2">
              <Copy size={16} />
              <Minimize2 size={16} />
            </span>
          </div>
          <div className="px-2">{msg.command.join(" ")}</div>
        </div>
      )}
    </div>
  );
}
