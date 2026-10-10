import AddServerDialog from "@/components/claude-code/AddServerDialog";
import PreConfiguredServersDialog from "@/components/claude-code/PreConfiguredServersDialog";
import { installedServerPath } from "@/components/server/utils/installedServer";
import { useViewStore } from "@/stores/viewStore";
import { useClientPathStore } from "@/stores/clientPathStore";
import ServerTable from "@/components/claude-code/ServerTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClaudeCodeManagement } from "@/hooks/useClaudeCodeManagement";
import { useCCProjectStore } from "@/stores/ccProject";
import { AlertCircle, Globe, RefreshCcw, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function ClaudeCodeManage() {
  const {
    servers,
    loading,
    claudeCliAvailable,
    checkClaudeCliAvailability,
    loadServers,
    addServer,
    removeServer,
    listProjects
  } = useClaudeCodeManagement();

  const { projects, selectedProject, setSelectedProject } = useCCProjectStore();

  const [addServerDialogOpen, setAddServerDialogOpen] = useState(false);

  const handleAddServer = async (formData: any) => {
    const result = await addServer(formData);
    if (result) {
      setAddServerDialogOpen(false);
    }
    return result;
  };

  const handleAddServerFromTable = () => {
    setAddServerDialogOpen(true);
  };

  const handleGetServerDetails = (serverName: string) => {
    useClientPathStore.getState().setSelectedClient("claude_code");
    useViewStore.getState().navigate(installedServerPath(serverName));
  };

  useEffect(() => {
    checkClaudeCliAvailability();
  }, [checkClaudeCliAvailability]);

  useEffect(() => {
    if (claudeCliAvailable) {
      loadServers();
      listProjects();
    }
  }, [claudeCliAvailable, selectedProject, loadServers, listProjects]);

  if (!claudeCliAvailable) {
    return (
      <div className="p-4 sm:p-6 bg-background text-foreground min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 sm:py-12 px-4">
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Not Available</h1>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              ~/.claude.json not found, The Claude Code CLI is not installed or not accessible. Please install it to use this feature.
            </p>
            <Button onClick={checkClaudeCliAvailability} className="mr-2">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProject && projects.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-background text-foreground min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 sm:py-12 px-4">
            <Settings className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold mb-2">No Projects Found</h1>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              No Claude Code projects found. Please create a project first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 space-y-4">
          {/* Title row */}
          <div>
            <h1 className="text-3xl font-bold">Claude Code MCP Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage MCP servers for Claude Code CLI client
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">(backup at ~/.claude.json.backup.timestamp)</p>
          </div>

          {/* Working Directory row */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium shrink-0">Working Directory:</Label>
            <Select
              value={selectedProject || undefined}
              onValueChange={setSelectedProject}
            >
              <SelectTrigger className="flex-1 min-w-0">
                <SelectValue placeholder="Select a project">
                  {selectedProject && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span>{selectedProject.split("/").filter(Boolean).slice(-2).join("/")}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                <SelectItem key={project} value={project}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>{project}</span>
                  </div>
                </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadServers}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <PreConfiguredServersDialog onAddServer={handleAddServer} />
            <AddServerDialog
              onAddServer={handleAddServer}
              open={addServerDialogOpen}
              onOpenChange={setAddServerDialogOpen}
            />
          </div>
        </div>

        <ServerTable
          servers={servers}
          loading={loading}
          onRefresh={loadServers}
          onViewDetails={handleGetServerDetails}
          onRemoveServer={removeServer}
          onAddServer={handleAddServerFromTable}
        />


      </div>
    </div>
  );
}