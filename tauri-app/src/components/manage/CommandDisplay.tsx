import { ServerTableData, SseConfig, StdioServerConfig } from "@/types";
import { Terminal } from "lucide-react";

interface CommandDisplayProps {
  config: ServerTableData;
}

export function CommandDisplay({ config }: CommandDisplayProps) {
  // Helper function to format command display
  const formatCommand = (serverConfig: ServerTableData) => {
    if (serverConfig.type === "http" || serverConfig.type === "sse") {
      const sseConfig = serverConfig as SseConfig;
      return sseConfig.url;
    } else {
      const stdioConfig = serverConfig as StdioServerConfig;
      const fullCommand =
        stdioConfig.args && stdioConfig.args.length > 0
          ? `${stdioConfig.command} ${stdioConfig.args.join(" ")}`
          : stdioConfig.command;
      return fullCommand.length > 50
        ? `${fullCommand.substring(0, 50)}...`
        : fullCommand;
    }
  };

  const isStdio = config.type !== "http" && config.type !== "sse";
  const command = formatCommand(config);

  return (
    <div className="flex items-center gap-2 max-w-xs">
      {isStdio ? (
        <Terminal className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full bg-orange-500 flex-shrink-0" />
      )}
      <code className="text-sm bg-muted px-2 py-1 rounded truncate">
        {command}
      </code>
    </div>
  );
}
