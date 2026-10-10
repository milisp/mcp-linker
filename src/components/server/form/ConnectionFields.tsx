import type { ServerConfig } from "@/types";
import { useId } from "react";
import { StringMapEditor } from "./StringMapEditor";

export function ConnectionFields({ config, onChange }: { config: ServerConfig; onChange: (config: ServerConfig) => void }) {
  const id = useId();
  if (config.type === "encrypted") return <p>Decrypt this configuration before editing.</p>;
  const inputClass = "w-full rounded-md border bg-transparent px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Transport</p>
        <p className="text-sm text-muted-foreground">{config.type === "stdio" ? "Local process (stdio)" : config.type === "http" ? "Streamable HTTP" : "Legacy SSE"}</p>
      </div>
      {config.type === "stdio" ? <>
        <div className="space-y-2"><label htmlFor={`${id}-command`} className="text-sm font-medium">Command</label><input id={`${id}-command`} className={inputClass} value={config.command} onChange={event => onChange({ ...config, command: event.target.value })} /></div>
        <div className="space-y-2"><label htmlFor={`${id}-args`} className="text-sm font-medium">Arguments (one per line)</label><textarea id={`${id}-args`} className={`${inputClass} min-h-24 font-mono`} value={config.args.join("\n")} onChange={event => onChange({ ...config, args: event.target.value.split("\n") })} /><p className="text-xs text-muted-foreground">Each line is passed as one argument, including spaces. Do not add shell quotes.</p></div>
        <StringMapEditor title="Environment variables" values={config.env ?? {}} onChange={env => onChange({ ...config, env })} secret />
      </> : <>
        <div className="space-y-2"><label htmlFor={`${id}-url`} className="text-sm font-medium">URL</label><input id={`${id}-url`} className={inputClass} value={config.url} onChange={event => onChange({ ...config, url: event.target.value })} /></div>
        <StringMapEditor title="Headers" values={config.headers ?? {}} onChange={headers => onChange({ ...config, headers })} secret />
      </>}
    </div>
  );
}
