import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import { useId, useState } from "react";

export function StringMapEditor({ title, values, onChange, secret = false }: {
  title: string; values: Record<string, string>; onChange: (values: Record<string, string>) => void; secret?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const keyLabel = title === "Environment variables" ? "Environment variable key" : title === "Headers" ? "Header key" : `${title} key`;
  return (
    <fieldset className="space-y-2">
      <legend className="w-full text-sm font-medium">
        <span className="flex items-center justify-between gap-2">
        {title}
        {secret && <Button type="button" variant="ghost" size="sm" onClick={() => setVisible(value => !value)} aria-pressed={visible} aria-label={`${visible ? "Hide" : "Show"} ${title}`}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>}
        </span>
      </legend>
      {Object.entries(values).map(([key, value], index) => (
        <div key={key} className="flex items-center gap-2">
          <label htmlFor={`${id}-${index}`} className="w-1/3 shrink-0 break-all text-xs font-medium">{key}</label>
          <input id={`${id}-${index}`} value={value} type={secret && !visible ? "password" : "text"} autoComplete="off" onChange={event => onChange({ ...values, [key]: event.target.value })} className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm" />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${key}`} onClick={() => {
            const next = { ...values }; delete next[key]; onChange(next);
          }}><X className="size-4" /></Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input value={newKey} onChange={event => setNewKey(event.target.value)} aria-label={`New ${keyLabel}`} placeholder={keyLabel} className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm" />
        <input value={newValue} onChange={event => setNewValue(event.target.value)} type={secret && !visible ? "password" : "text"} autoComplete="off" aria-label={`New ${title} value`} placeholder="Value" className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm" />
        <Button type="button" variant="outline" size="sm" disabled={!newKey.trim() || newKey.trim() in values} onClick={() => { onChange({ ...values, [newKey.trim()]: newValue }); setNewKey(""); setNewValue(""); }}><Plus className="size-3" /> Add</Button>
      </div>
    </fieldset>
  );
}
