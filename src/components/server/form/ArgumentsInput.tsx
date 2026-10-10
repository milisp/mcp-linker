import { useEffect, useId, useRef, useState } from "react";
import { formatArguments, parseArguments } from "../utils/arguments";

export function ArgumentsInput({ args, onChange, onValidityChange }: {
  args: string[]; onChange: (args: string[]) => void; onValidityChange: (valid: boolean) => void;
}) {
  const id = useId();
  const [text, setText] = useState(() => formatArguments(args));
  const [error, setError] = useState<string | null>(null);
  const lastArgs = useRef(args);
  useEffect(() => {
    if (lastArgs.current === args) return;
    lastArgs.current = args;
    setText(formatArguments(args));
    setError(null);
    onValidityChange(true);
  }, [args, onValidityChange]);
  return <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium">Arguments</label>
    <textarea id={id} value={text} className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono" aria-invalid={!!error} aria-describedby={`${id}-help`} placeholder='-y package-name "path with spaces"' onChange={event => {
      const value = event.target.value;
      setText(value);
      try {
        const next = parseArguments(value);
        lastArgs.current = next;
        onChange(next);
        setError(null); onValidityChange(true);
      } catch (error) {
        setError((error as Error).message);
        onValidityChange(false);
      }
    }} />
    <p id={`${id}-help`} className="text-xs text-muted-foreground">Paste arguments only, without the command. Quote values containing spaces.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
