import { findCatalogServer } from "@/data/mcp-servers/catalog";
import { ContentLoadingFallback } from "@/components/common/LoadingConfig";
import { ServerConfigForm } from "@/components/server/form/ServerConfigForm";
import { useServerConfig } from "@/components/server/hooks/useServerConfig";
import { ServerBadge, ServerMeta } from "@/components/server/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGithubReadmeJson } from "@/hooks/useGithubReadmeJson";
import { fetchRegistryServer } from "@/lib/registry";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useViewStore } from "@/stores/viewStore";
import { useFavoriteServers } from "@/stores/favoriteServers";
import { openUrl } from "@/utils/urlHelper";
import { serverTransportLabels } from "@/components/server/utils/quickInstall";
import type { ServerConfig, ServerType } from "@/types";
import { useSaveServerConfig } from "@/components/server/hooks/useSaveServerConfig";
import { ChevronLeft, ExternalLink, Star, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ServerPage() {
  const [server, setServer] = useState<ServerType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [curIndex, setCurIndex] = useState(0);
  const favoriteServers = useFavoriteServers(state => state.favoriteServers);
  const toggleFavorite = useFavoriteServers(state => state.toggleFavorite);
  const { id, owner, repo } = useViewStore((s) => s.params);
  const { navigate } = useViewStore();

  const { selectedClient, selectedPath } = useClientPathStore();
  const { saveServerConfig } = useSaveServerConfig();

  // Always call hooks at the top level
  const {
    serverName,
    setServerName,
    config,
    setConfig,
    envValues,
    setEnvValues,
    handleArgsChange,
    handleCommandChange,
    handleEnvChange,
  } = useServerConfig(true, selectedClient);

  const configs = server?.configs?.length ? server.configs : [config];
  const onConfigChange = (nextConfig: ServerConfig, index: number) => {
    setCurIndex(index);
    setConfig(nextConfig);
    setEnvValues(nextConfig.type === "stdio" ? nextConfig.env ?? {} : {});
  };
  const onSseConfigChange = (nextConfig: ServerConfig) => setConfig(nextConfig);

  const onSubmit = async () => {
    if (!server) return;
    if (!serverName.trim()) {
      toast.error("Please enter a server name");
      return;
    }
    await saveServerConfig({
      selectedClient,
      selectedPath: selectedPath || "",
      currentServer: server,
      serverName,
      config,
      setIsDialogOpen: () => {},
    });
  };

  // Add the useGithubReadmeJson hook
  const { fetchAllJsonBlocks } = useGithubReadmeJson();

  // Helper to safely set server and config state
  function applyServerConfig(serverData: ServerType) {
    setServer(serverData);
    setCurIndex(0);
    // Registry names are reverse-DNS; clients expect the short last segment.
    setServerName(serverData.id.split("/").pop() || serverData.name);
    const configItem = (serverData.configs?.[0] as any) || {};
    setConfig(configItem);
    setEnvValues(configItem.env || {});
  }

  useEffect(() => {
    const fetchServer = async () => {
      setIsLoading(true);
      setServer(null);
      try {
        let serverData: ServerType | null = null;
        if (id) {
          const serverId = decodeURIComponent(id);
          serverData = findCatalogServer(serverId)
            ?? useFavoriteServers.getState().favoriteServers.find(item => item.id === serverId)
            ?? await fetchRegistryServer(serverId);
          if (!serverData) throw new Error("Server not found in registry");
          applyServerConfig(serverData);
        } else if (owner && repo) {
          throw new Error("No registry id, falling back to GitHub README");
        }

        // SECURITY: no auto-submit from the URL. This used to silently
        // write a registry server's command into the client config on a
        // 3-second timer with no user confirmation, reachable from a
        // deep link exactly like the install-app page. Adding a server
        // must always be an explicit click.
      } catch (e: any) {
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
                    // Use helper to set state, ensure env fallback
                    setServer(fallbackServer);
                    setServerName(firstName);
                    setConfig(configValue);
                    setEnvValues(configValue.env || {});
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
        setIsLoading(false);
        toast.dismiss();
      }
    };
    fetchServer();
  }, [id, owner, repo]);

  if (isLoading) return <ContentLoadingFallback />;
  if (!server)
    return (
      <div>
        Server not found {owner} {repo} {id}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button
        onClick={() => navigate(-1)}
        variant="ghost"
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{server.name}</span>
            <ServerBadge isOfficial={server.isOfficial} />
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {serverTransportLabels(server).map(label => (
              <span key={label} className="rounded bg-muted px-2 py-1 text-xs font-medium">{label}</span>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFavorite(server)}
              aria-pressed={favoriteServers.some(item => item.id === server.id)}
            >
              <Star className={favoriteServers.some(item => item.id === server.id) ? "fill-yellow-400 text-yellow-500" : ""} />
              {favoriteServers.some(item => item.id === server.id) ? "Remove favorite" : "Favorite"}
            </Button>
            {server.source && (
              <Button variant="outline" size="sm" onClick={() => openUrl(server.source)}>
                <ExternalLink /> Website
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">{server.description}</p>
          {server.tags?.length ? <p className="text-sm text-muted-foreground">{server.tags.join(" · ")}</p> : null}
          {server.tools?.length ? <p className="text-sm text-muted-foreground">Tools: {server.tools.join(", ")}</p> : null}

          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <ServerMeta icon={User} value={server.developer} />
            {server.version && <span>v{server.version}</span>}
          </div>
        </CardContent>
      </Card>

      <ServerConfigForm
        serverName={serverName}
        setServerName={setServerName}
        configs={configs}
        curIndex={curIndex}
        onConfigChange={onConfigChange}
        config={config}
        envValues={envValues}
        setEnvValues={setEnvValues}
        onCommandChange={handleCommandChange}
        onArgsChange={handleArgsChange}
        onEnvChange={handleEnvChange}
        onSseConfigChange={onSseConfigChange}
        onSubmit={onSubmit}
        selectedClient={selectedClient}
      />
    </div>
  );
}
