import type { ServerConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { ArgumentsInput } from "./ArgumentsInput";
import { StringMapEditor } from "./StringMapEditor";

const COMMAND_SHORTCUTS = ["npx", "bunx", "uvx", "docker", "python", "node"];

/** Renders one section per field; the parent draws the dividers between them. */
export function ConnectionFields({ config, onChange, sectionClassName, showTransport = true, commandShortcuts = false }: {
  config: ServerConfig; onChange: (config: ServerConfig) => void; sectionClassName: string; showTransport?: boolean; commandShortcuts?: boolean;
}) {
  const id = useId();
  if (config.type === "encrypted") return <p className={sectionClassName}>Decrypt this configuration before editing.</p>;
  const inputClass = "w-full rounded-md border bg-transparent px-3 py-2 text-sm";
  const transport = config.type === "stdio" ? "Local process (stdio)" : config.type === "http" ? "Streamable HTTP" : "Legacy SSE";
  const heading = (htmlFor: string, label: string) => (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {showTransport && <span className="text-xs text-muted-foreground">{transport}</span>}
    </div>
  );
  return config.type === "stdio" ? <>
    <div className={sectionClassName}>
      {heading(`${id}-command`, "Command to launch")}
      <input id={`${id}-command`} className={`${inputClass} font-mono`} value={config.command} placeholder={commandShortcuts ? "npx" : undefined} onChange={event => onChange({ ...config, command: event.target.value })} />
      {commandShortcuts && <div className="flex flex-wrap gap-1.5" aria-label="Common commands">
        {COMMAND_SHORTCUTS.map(command => <Button key={command} type="button" size="sm" variant={config.command === command ? "secondary" : "outline"} className="h-7 px-2.5 font-mono text-xs" onClick={() => onChange({ ...config, command })}>{command}</Button>)}
      </div>}
    </div>
    <div className={sectionClassName}><ArgumentsInput args={config.args} onChange={args => onChange({ ...config, args })} /></div>
    <div className={sectionClassName}><StringMapEditor title="Environment variables" addLabel="Add environment variable" values={config.env ?? {}} onChange={env => onChange({ ...config, env })} secret /></div>
  </> : <>
    <div className={sectionClassName}>
      {heading(`${id}-url`, "URL")}
      <input id={`${id}-url`} className={inputClass} value={config.url} onChange={event => onChange({ ...config, url: event.target.value })} />
    </div>
    <div className={sectionClassName}><StringMapEditor title="Headers" addLabel="Add header" values={config.headers ?? {}} onChange={headers => onChange({ ...config, headers })} secret /></div>
  </>;
}
