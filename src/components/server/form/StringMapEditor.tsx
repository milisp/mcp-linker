import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Row = { key: string; value: string };

const toRows = (values: Record<string, string>): Row[] => {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: "", value: "" }];
};

export function StringMapEditor({ title, addLabel, values, onChange, secret = false }: {
  title: string; addLabel: string; values: Record<string, string>; onChange: (values: Record<string, string>) => void; secret?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState(() => toRows(values));
  const emitted = useRef(values);
  useEffect(() => {
    if (emitted.current === values) return;
    emitted.current = values;
    setRows(toRows(values));
  }, [values]);

  const keyInputs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndex = useRef<number | null>(null);
  useEffect(() => {
    if (focusIndex.current === null) return;
    keyInputs.current[focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [rows]);

  const update = (next: Row[]) => {
    setRows(next);
    // Rows without a key are still being typed and are not saved.
    emitted.current = Object.fromEntries(next.filter(row => row.key.trim()).map(row => [row.key.trim(), row.value]));
    onChange(emitted.current);
  };
  const isDuplicate = (key: string, index: number) => !!key.trim() && rows.findIndex(row => row.key.trim() === key.trim()) !== index;

  return (
    <fieldset className="space-y-2">
      <legend className="w-full text-sm font-medium">
        <span className="flex items-center justify-between gap-2">
          {title}
          {secret && <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setVisible(value => !value)} aria-pressed={visible} aria-label={`${visible ? "Hide" : "Show"} ${title} values`}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>}
        </span>
      </legend>
      {rows.map((row, index) => {
        const duplicate = isDuplicate(row.key, index);
        const blank = rows.length === 1 && !row.key && !row.value;
        return (
          <div key={index} className="flex items-center gap-2">
            <input ref={el => { keyInputs.current[index] = el; }} value={row.key} placeholder="Key" aria-label={`${title} key ${index + 1}`} aria-invalid={duplicate} title={duplicate ? "Duplicate key: the last value wins" : undefined}
              onChange={event => update(rows.map((current, i) => i === index ? { ...current, key: event.target.value } : current))}
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive" />
            <input value={row.value} placeholder="Value" type={secret && !visible ? "password" : "text"} autoComplete="off" aria-label={`${title} value ${index + 1}`}
              onChange={event => update(rows.map((current, i) => i === index ? { ...current, value: event.target.value } : current))}
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm" />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${row.key || `row ${index + 1}`}`} disabled={blank}
              onClick={() => update(rows.length === 1 ? [{ key: "", value: "" }] : rows.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => { focusIndex.current = rows.length; setRows([...rows, { key: "", value: "" }]); }}><Plus className="size-3.5" /> {addLabel}</Button>
    </fieldset>
  );
}
