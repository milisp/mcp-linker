import { fetchInstalledServer } from "@/components/server/utils/installedServer";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useCCProjectStore } from "@/stores/ccProject";
import { ServerWorkspace } from "@/components/server/ServerWorkspace";
import { findCatalogServer } from "@/data/mcp-servers/catalog";
import { ContentLoadingFallback } from "@/components/common/LoadingConfig";
import { ServerBadge, ServerMeta } from "@/components/server/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGithubReadmeJson } from "@/hooks/useGithubReadmeJson";
import { fetchRegistryServer } from "@/lib/registry";
import { useViewStore } from "@/stores/viewStore";
import { useFavoriteServers } from "@/stores/favoriteServers";
import { openUrl } from "@/utils/urlHelper";
import { serverTransportLabels } from "@/components/server/utils/quickInstall";
import type { ServerType } from "@/types";
import { ChevronLeft, Cloud, ExternalLink, Star, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ServerPage() {
  const [server, setServer] = useState<ServerType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const favoriteServers = useFavoriteServers(state => state.favoriteServers);
  const toggleFavorite = useFavoriteServers(state => state.toggleFavorite);
  const { id, owner, repo } = useViewStore((s) => s.params);
  const { navigate, search, historyIndex } = useViewStore();
  const { selectedClient, selectedPath } = useClientPathStore();
  const selectedProject = useCCProjectStore(state => state.selectedProject);
  const selectedScope = useCCProjectStore(state => state.selectedScope);
  const installedRoute = !!id && decodeURIComponent(id).startsWith("installed:");
  const goBack = () => historyIndex > 0 ? navigate(-1) : navigate(installedRoute ? "/manage" : "/", { replace: true });
  const installedTarget = installedRoute ? JSON.stringify([selectedClient, selectedPath, selectedProject, selectedScope]) : "catalog";
  const [error, setError] = useState<string | null>(null);
  const { fetchAllJsonBlocks } = useGithubReadmeJson();

  useEffect(() => {
    let cancelled = false;
    const fetchServer = async () => {
      setIsLoading(true);
      setServer(null);
      setError(null);
      try {
        let serverData: ServerType | null = null;
        if (id) {
          const serverId = decodeURIComponent(id);
          if (serverId.startsWith("installed:")) {
            const entry = await fetchInstalledServer(serverId.slice("installed:".length), selectedClient, selectedPath, selectedProject);
            if (!cancelled) setServer(entry);
            return;
          }
          serverData = findCatalogServer(serverId)
            ?? useFavoriteServers.getState().favoriteServers.find(item => item.id === serverId)
            ?? await fetchRegistryServer(serverId);
          if (!serverData) throw new Error("Server not found in registry");
          if (!cancelled) setServer(serverData);
        } else if (owner && repo) {
          throw new Error("No registry id, falling back to GitHub README");
        }

        // SECURITY: no auto-submit from the URL. This used to silently
        // write a registry server's command into the client config on a
        // 3-second timer with no user confirmation, reachable from a
        // deep link exactly like the install-app page. Adding a server
        // must always be an explicit click.
      } catch (e: any) {
        if (id && decodeURIComponent(id).startsWith("installed:")) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
          return;
        }
        // If API fetch fails, try to fetch JSON blocks from GitHub README
        console.error("Failed to fetch data", e);
        toast.info("Trying to fetch from GitHub README...");
        try {
          // Construct GitHub repo URL from owner/repo params
          if (owner && repo) {
            const githubUrl = `https://github.com/${owner}/${repo}`;
            const jsonBlocks = await fetchAllJsonBlocks(githubUrl);
            let found = false;
            if (jsonBlocks && jsonBlocks.length > 0) {
              for (const block of jsonBlocks) {
                if (
                  block &&
                  typeof block === "object" &&
                  block.mcpServers &&
                  typeof block.mcpServers === "object"
                ) {
                  const mcpServers = block.mcpServers;
                  const serverNames = Object.keys(mcpServers);
                  if (serverNames.length > 0) {
                    const firstName = serverNames[0];
                    const configValue = mcpServers[firstName];
                    const fallbackServer: ServerType = {
                      id: "",
                      name: firstName,
                      developer: owner,
                      logoUrl: "",
                      description: "",
                      source: githubUrl,
                      isOfficial: false,
                      isFavorited: false,
                      tags: [],
                      tools: [],
                    };
                    if (!cancelled) setServer({ ...fallbackServer, configs: [{ ...configValue, type: configValue.command ? "stdio" : configValue.type || "http", args: configValue.args || [] }] });
                    toast.success("Loaded config from GitHub README");
                    found = true;
                    break;
                  }
                }
              }
              if (!found) {
                toast.error(
                  "No valid mcpServers found in any GitHub README block",
                );
              }
            } else {
              toast.error("No valid JSON config found in GitHub README");
            }
          } else {
            toast.error("No owner/repo info for GitHub fallback");
          }
        } catch (error) {
          // Fallback also failed
          toast.error("Failed to fetch from GitHub README");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchServer();
    return () => { cancelled = true; };
  }, [id, owner, repo, installedTarget]);

  if (isLoading) return <ContentLoadingFallback />;
  if (!server)
    return (
      <div>
        <p role="alert">{error || `Server not found ${owner || ""} ${repo || ""} ${id || ""}`}</p>
        <Button variant="ghost" onClick={goBack}>Back</Button>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button
        onClick={goBack}
        variant="ghost"
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="min-w-0 break-words">{server.name}</span>
            <div className="flex shrink-0 items-center gap-2">
            {serverTransportLabels(server).map(label => <Badge key={label} variant="secondary">{label === "Remote" && <Cloud aria-hidden="true" />}{label}</Badge>)}
            {server.installed ? <span className="text-xs text-muted-foreground">{server.installed.disabled ? "Disabled" : "Installed"}</span> : <ServerBadge isOfficial={server.isOfficial} />}
            {!server.installed && <Button variant="ghost" size="icon" onClick={() => toggleFavorite(server)} aria-label={favoriteServers.some(item => item.id === server.id) ? "Remove favorite" : "Add favorite"} aria-pressed={favoriteServers.some(item => item.id === server.id)}>
              <Star className={favoriteServers.some(item => item.id === server.id) ? "fill-yellow-400 text-yellow-500" : ""} />
            </Button>}
            </div>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <ServerMeta icon={User} value={server.developer} />
            {server.version && <span>v{server.version}</span>}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {server.websiteUrl && <Button variant="outline" size="sm" onClick={() => openUrl(server.websiteUrl!)}><ExternalLink /> Website</Button>}
            {(server.repositoryUrl || (server.source && server.source !== server.websiteUrl)) && (
              <Button variant="outline" size="sm" onClick={() => openUrl(server.repositoryUrl || server.source)}>
                <ExternalLink /> {server.repositoryUrl ? "Source code" : "Project page"}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">{server.description}</p>
          {server.tags?.length ? <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Category:</span>{server.tags.map(tag => <Button key={tag} variant="outline" size="sm" onClick={() => navigate(`/discover?category=${encodeURIComponent(tag)}`)}>{tag}</Button>)}</div> : null}
          {server.tools?.length ? <p className="text-sm text-muted-foreground">Tools: {server.tools.join(", ")}</p> : null}
        </CardContent>
      </Card>

      <div className="mt-6"><ServerWorkspace key={server.id} server={server} initialTab={search.tab === "tools" ? "tools" : "connection"} /></div>
    </div>
  );
}
