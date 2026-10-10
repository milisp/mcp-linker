// Argument tokenization only: no shell execution, expansion or substitution.
export function parseArguments(text: string): string[] {
  const args: string[] = [];
  let token = "";
  let started = false;
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\" && quote !== "'") {
      const next = text[i + 1];
      if (next !== undefined && (next === "\\" || next === '"' || (!quote && (next === "'" || /\s/.test(next))))) {
        token += next; i++; started = true; continue;
      }
    }
    if (quote) {
      if (char === quote) quote = "";
      else token += char;
    } else if (char === "'" || char === '"') {
      quote = char; started = true;
    } else if (/\s/.test(char)) {
      if (started) { args.push(token); token = ""; started = false; }
    } else {
      token += char; started = true;
    }
  }
  if (quote) throw new Error("Close the quoted argument before saving.");
  if (started) args.push(token);
  return args;
}

export function formatArguments(args: string[]): string {
  return args.map(arg => arg && !/[\s'"\\]/.test(arg) ? arg : `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ");
}
