import { useToast } from "@/hooks/use-toast";
import { useCCProjectStore } from "@/stores/ccProject";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

interface ClaudeCodeServer {
  name: string;
  type: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

interface AddServerRequest {
  name: string;
  type: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ServerFormData {
  name: string;
  type: "http" | "sse" | "stdio";
  url: string;
  command: string;
  args: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export function useClaudeCodeManagement() {
  const { toast } = useToast();
  const { selectedProject, setProjects, setSelectedProject } = useCCProjectStore();
  const [servers, setServers] = useState<ClaudeCodeServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claudeCliAvailable, setClaudeCliAvailable] = useState(false);

  const checkClaudeCliAvailability = useCallback(async () => {
    try {
      const available = await invoke<boolean>("check_claude_config_exists");
      setClaudeCliAvailable(available);
      if (!available) {
        toast({
          title: "~/.claude.json Not Found",
          description: "~/.claude.json Not Found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error checking Claude CLI:", error);
      setClaudeCliAvailable(false);
    }
  }, [toast]);

  const loadServers = useCallback(async () => {
    if (!claudeCliAvailable || !selectedProject) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const serverList = await invoke<ClaudeCodeServer[]>("claude_mcp_list", { 
        workingDir: selectedProject 
      });
      console.log(serverList);
      setServers(serverList);
    } catch (error) {
      console.error("Error loading servers:", error);
      toast({
        title: "Error loading servers",
        description: `Failed to fetch MCP servers: ${error}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [claudeCliAvailable, selectedProject, toast]);

  const addServer = async (formData: ServerFormData) => {
    try {
      const { name, type, url, command, args, env, headers } = formData;
      
      if (!name.trim()) {
        toast({
          title: "Validation Error",
          description: "Server name is required",
          variant: "destructive"
        });
        return false;
      }

      const request: AddServerRequest = {
        name: name.trim(),
        type
      };

      if (type === "http" || type === "sse") {
        if (!url.trim()) {
          toast({
            title: "Validation Error",
            description: "URL is required for HTTP/SSE servers",
            variant: "destructive"
          });
          return false;
        }
        request.url = url.trim();
      } else if (type === "stdio") {
        if (!command.trim()) {
          toast({
            title: "Validation Error",
            description: "Command is required for stdio servers",
            variant: "destructive"
          });
          return false;
        }
        request.command = command.trim();
        if (args.trim()) {
          request.args = args.trim().split(/\s+/);
        }
      }

      if (env && Object.keys(env).length > 0) {
        request.env = env;
      }

      if (headers && Object.keys(headers).length > 0) {
        request.headers = headers;
      }

      const response = await invoke<{success: boolean, message: string}>("claude_mcp_add", { 
        request, 
        workingDir: selectedProject 
      });
      
      if (response.success) {
        toast({
          title: "Server Added",
          description: response.message,
        });
        await loadServers();
        return true;
      } else {
        toast({
          title: "Error adding server",
          description: response.message,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Error adding server:", error);
      toast({
        title: "Error adding server",
        description: `Failed to add server: ${error}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const removeServer = async (serverName: string) => {
    try {
      const response = await invoke<{success: boolean, message: string}>("claude_mcp_remove", { 
        name: serverName,
        workingDir: selectedProject
      });
      
      if (response.success) {
        toast({
          title: "Server Removed",
          description: response.message,
        });
        await loadServers();
      } else {
        toast({
          title: "Error removing server",
          description: response.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error removing server:", error);
      toast({
        title: "Error removing server",
        description: `Failed to remove server: ${error}`,
        variant: "destructive"
      });
    }
  };

  const getServerDetails = async (serverName: string): Promise<ClaudeCodeServer | null> => {
    try {
      const server = await invoke<ClaudeCodeServer>("claude_mcp_get", { 
        name: serverName,
        workingDir: selectedProject
      });
      return server;
    } catch (error) {
      console.error("Error getting server details:", error);
      toast({
        title: "Error getting server details",
        description: `Failed to fetch server details: ${error}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const listProjects = useCallback(async () => {
    const projectList = await invoke<string[]>("claude_list_projects");
    setProjects(projectList);
    if (projectList.length > 0 && !selectedProject) {
      setSelectedProject(projectList[0]);
    }
  }, [selectedProject]);

  return {
    servers,
    loading,
    claudeCliAvailable,
    checkClaudeCliAvailability,
    loadServers,
    addServer,
    removeServer,
    getServerDetails,
    listProjects
  };
}