import type { ServerConfig } from "@/types";
import { useId } from "react";
import { StringMapEditor } from "./StringMapEditor";
import { ArgumentsInput } from "./ArgumentsInput";

export function ConnectionFields({ config, onChange, onValidityChange }: { config: ServerConfig; onChange: (config: ServerConfig) => void; onValidityChange: (valid: boolean) => void }) {
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
        <ArgumentsInput args={config.args} onChange={args => onChange({ ...config, args })} onValidityChange={onValidityChange} />
        <StringMapEditor title="Environment variables" values={config.env ?? {}} onChange={env => onChange({ ...config, env })} secret />
      </> : <>
        <div className="space-y-2"><label htmlFor={`${id}-url`} className="text-sm font-medium">URL</label><input id={`${id}-url`} className={inputClass} value={config.url} onChange={event => onChange({ ...config, url: event.target.value })} /></div>
        <StringMapEditor title="Headers" values={config.headers ?? {}} onChange={headers => onChange({ ...config, headers })} secret />
      </>}
    </div>
  );
}
