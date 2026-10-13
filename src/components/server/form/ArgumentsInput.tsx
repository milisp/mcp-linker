import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseArguments } from "../utils/arguments";

/** One input per argument, so values with spaces need no quoting. */
export function ArgumentsInput({ args, onChange }: { args: string[]; onChange: (args: string[]) => void }) {
  const [rows, setRows] = useState(() => args.length ? args : [""]);
  const emitted = useRef(args);
  useEffect(() => {
    if (emitted.current === args) return;
    emitted.current = args;
    setRows(args.length ? args : [""]);
  }, [args]);

  const update = (next: string[]) => {
    setRows(next);
    // Blank rows are placeholders for typing, not empty-string arguments.
    emitted.current = next.filter(arg => arg !== "");
    onChange(emitted.current);
  };

  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">Arguments</legend>
    {rows.map((arg, index) => (
      <div key={index} className="flex items-center gap-2">
        <input
          value={arg}
          aria-label={`Argument ${index + 1}`}
          className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
          onChange={event => update(rows.map((value, i) => i === index ? event.target.value : value))}
          onPaste={event => {
            // A command line pasted into an empty row becomes one row per argument.
            if (arg) return;
            let parsed: string[];
            try { parsed = parseArguments(event.clipboardData.getData("text")); } catch { return; }
            if (parsed.length < 2) return;
            event.preventDefault();
            update([...rows.slice(0, index), ...parsed, ...rows.slice(index + 1)]);
          }}
        />
        <Button type="button" variant="ghost" size="icon" aria-label={`Remove argument ${index + 1}`} disabled={rows.length === 1 && !arg} onClick={() => update(rows.length === 1 ? [""] : rows.filter((_, i) => i !== index))}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    ))}
    <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setRows([...rows, ""])}><Plus className="size-3.5" /> Add argument</Button>
  </fieldset>;
}
