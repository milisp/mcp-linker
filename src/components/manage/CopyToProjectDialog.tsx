import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { selectedProject, selectedScope } = useCCProjectStore();
  const saved = useProjectPreferences(state => state.preferences.claude_code?.visibleProjects);
  // Same choices as the sidebar "Projects" list in InstallationTarget.
  const visible = saved ?? (selectedProject ? [selectedProject] : []);
  const targets = [...new Set([...visible, ...(selectedProject ? [selectedProject] : [])])];
  const [toDir, setToDir] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toScope, setToScope] = useState<ClaudeCodeScope>("local");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsProject = toScope !== "user";

  const reset = (next: boolean) => {
    if (!next) { setExists(false); setToDir(""); setPickerOpen(false); }
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
      <DialogContent className="sm:max-w-2xl">
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
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={pickerOpen} aria-label="Target project" className="justify-between font-normal">
                  <span className="min-w-0 truncate">{toDir ? basename(toDir) : "Choose a project"}</span>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Filter projects" />
                  <CommandList>
                    <CommandEmpty>No matching project.</CommandEmpty>
                    <CommandGroup>
                      {targets.map(path => (
                        <CommandItem key={path} value={path} onSelect={() => { setToDir(path); setExists(false); setPickerOpen(false); }}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{basename(path)}</span>
                            <span className="break-all text-xs text-muted-foreground">{path}</span>
                          </span>
                          {toDir === path && <Check className="ml-auto" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" aria-label={`${t("manage.copyToProject")}: ${serverName}`} title={t("manage.copyToProject")} onClick={() => setOpen(true)}><FolderInput className="size-4" />{t("manage.copyTo")}</Button>
      <CopyToProjectDialog serverName={serverName} open={open} onOpenChange={setOpen} />
    </>
  );
}
