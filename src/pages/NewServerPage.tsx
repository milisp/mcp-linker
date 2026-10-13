import { ServerWorkspace } from "@/components/server/ServerWorkspace";
import { findServerConfigs, type ImportedServer } from "@/components/server/utils/importServerJson";
import { installedServerPath } from "@/components/server/utils/installedServer";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGithubReadmeJson } from "@/hooks/useGithubReadmeJson";
import { useViewStore } from "@/stores/viewStore";
import type { ServerConfig, ServerType } from "@/types";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { Github } from "@/components/icons";
import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const BLANK: ServerConfig[] = [
  { type: "stdio", command: "", args: [], env: {} },
  { type: "http", url: "", headers: {} },
  { type: "sse", url: "", headers: {} },
];

/** A fresh id per form gives the editor a fresh draft. */
function customServer(imported?: ImportedServer): ServerType {
  return {
    id: `custom:${crypto.randomUUID()}`, name: imported?.name ?? "", description: "", source: "custom",
    isOfficial: false, isFavorited: false,
    // The imported config comes first so it is the one selected.
    configs: imported ? [imported.config, ...BLANK.filter(config => config.type !== imported.config.type)] : BLANK,
  };
}

export function NewServerPage() {
  const { t } = useTranslation();
  const navigate = useViewStore(state => state.navigate);
  const [server, setServer] = useState(customServer);
  const [candidates, setCandidates] = useState<ImportedServer[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const { loading, fetchAllJsonBlocks } = useGithubReadmeJson();

  const apply = (item: ImportedServer) => {
    setServer(customServer(item));
    setCandidates([]);
  };
  const offer = (found: ImportedServer[], source: string) => {
    if (found.length === 0) toast.error(`No server configuration with a command or url found in ${source}`);
    else if (found.length === 1) { apply(found[0]); toast.success(`Imported from ${source}`); }
    else setCandidates(found);
  };

  const pasteJson = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(await readText()); } catch {
      toast.error("The clipboard does not contain valid JSON");
      return;
    }
    offer(findServerConfigs(parsed), "the clipboard");
  };
  const loadGithub = async () => {
    const blocks = await fetchAllJsonBlocks(githubUrl.trim());
    if (!blocks) { toast.error("Could not read JSON from that repository's README"); return; }
    offer(blocks.flatMap(findServerConfigs), "the README");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("addCustomServer")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={pasteJson}><ClipboardPaste className="size-4" /> Paste JSON</Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm"><Github className="size-4" /> From GitHub</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] space-y-2">
              <p className="text-sm text-muted-foreground">Read server configurations from a repository's README.</p>
              <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void loadGithub(); }}>
                <input value={githubUrl} onChange={event => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repo" aria-label="GitHub repository URL" className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm" />
                <Button type="submit" size="sm" disabled={loading || !githubUrl.trim()}>{loading ? "Loading..." : "Load"}</Button>
              </form>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Found {candidates.length} configurations. Choose one:</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((item, index) => (
              <Button key={index} variant="outline" size="sm" onClick={() => apply(item)}>
                {item.name || `Configuration ${index + 1}`} · {item.config.type}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ServerWorkspace key={server.id} server={server} onSaved={name => navigate(installedServerPath(name, "connection"), { replace: true })} />
    </div>
  );
}
