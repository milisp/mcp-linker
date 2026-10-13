import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { claudeWrite, LicenseRequiredError } from "@/lib/claude";
import { type ClaudeCodeScope, useCCProjectStore } from "@/stores/ccProject";
import { useProjectPreferences } from "@/stores/projectPreferences";
import { useState } from "react";
import { toast } from "sonner";

const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;

/** Copies one Claude Code server, unchanged, to another project or scope. */
export function CopyToProjectDialog({ serverName, open, onOpenChange }: {
  serverName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projects, selectedProject, selectedScope } = useCCProjectStore();
  const visible = useProjectPreferences(state => state.preferences.claude_code?.visibleProjects ?? []);
  const targets = [...new Set([...visible, ...projects])].filter(Boolean);
  const [toDir, setToDir] = useState("");
  const [toScope, setToScope] = useState<ClaudeCodeScope>("local");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsProject = toScope !== "user";

  const reset = (next: boolean) => {
    if (!next) { setExists(false); setToDir(""); }
    onOpenChange(next);
  };

  const copy = async (overwrite: boolean) => {
    setBusy(true);
    try {
      await claudeWrite("claude_mcp_copy", {
        name: serverName,
        fromDir: selectedProject ?? "",
        fromScope: selectedScope,
        toDir: needsProject ? toDir : "",
        toScope,
        overwrite,
      });
      toast.success(`Copied "${serverName}" to ${needsProject ? basename(toDir) : "User scope"}`);
      window.dispatchEvent(new CustomEvent("mcpDataRefresh"));
      reset(false);
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error);
      if (message.startsWith("EXISTS:")) setExists(true);
      else if (!(error instanceof LicenseRequiredError)) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy "{serverName}"</DialogTitle>
          <DialogDescription>
            Copies the server's full configuration, including headers and authentication settings, to another Claude Code project or scope. The original stays where it is.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <Select value={toScope} onValueChange={value => { setToScope(value as ClaudeCodeScope); setExists(false); }}>
            <SelectTrigger className="w-28" aria-label="Target scope"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          {needsProject && (
            <Select value={toDir} onValueChange={value => { setToDir(value); setExists(false); }}>
              <SelectTrigger aria-label="Target project"><SelectValue placeholder="Choose a project" /></SelectTrigger>
              <SelectContent>
                {targets.map(path => (
                  <SelectItem key={path} value={path}>
                    <span className="block">{basename(path)}</span>
                    <span className="block max-w-sm break-all text-xs text-muted-foreground">{path}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {exists && (
          <p role="alert" className="text-sm text-destructive">
            "{serverName}" already exists there. Replace it with this configuration?
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => reset(false)}>Cancel</Button>
          <Button
            variant={exists ? "destructive" : "default"}
            disabled={busy || (needsProject && !toDir)}
            onClick={() => copy(exists)}
          >
            {exists ? "Replace" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Row action shown for enabled Claude Code servers. */
export function CopyToProjectButton({ serverName }: { serverName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Copy to…</Button>
      <CopyToProjectDialog serverName={serverName} open={open} onOpenChange={setOpen} />
    </>
  );
}
