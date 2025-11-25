export function OutputBlock({ label, value }: { label: string; value: string }) {
  if (!value || !value.trim()) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-mono text-xs">
        {value}
      </pre>
    </div>
  );
}
