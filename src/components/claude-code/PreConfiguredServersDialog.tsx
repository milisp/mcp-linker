import { MCP_REGISTRY_SERVERS } from "@/data/mcp-servers";
import { registryServerToPresets, type MCPServerPreset } from "@/data/mcp-servers/toPresets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Plus, ExternalLink, Settings } from "lucide-react";
import { useState } from "react";


const MCP_SERVER_PRESETS = MCP_REGISTRY_SERVERS.flatMap(registryServerToPresets);

interface PreConfiguredServersDialogProps {
  onAddServer: (formData: any) => Promise<boolean>;
}

export default function PreConfiguredServersDialog({ onAddServer }: PreConfiguredServersDialogProps) {
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  const categories = Array.from(new Set(MCP_SERVER_PRESETS.map(server => server.category)));

  const handleInstallServer = async (server: MCPServerPreset) => {
    if (installing) return;
    
    if (server.envVars && server.envVars.length > 0) {
      setConfiguring(server.name);
      return;
    }
    
    setInstalling(server.name);
    
    try {
      const formData = {
        name: server.name,
        type: server.type,
        url: server.url || "",
        command: server.command || "",
        args: server.args || "",
        headers: server.headers
      };
      
      const success = await onAddServer(formData);
      if (success) {
        // Optionally close dialog on successful installation
        // setOpen(false);
      }
    } finally {
      setInstalling(null);
    }
  };

  const handleConfigureAndInstall = async (server: MCPServerPreset) => {
    if (installing) return;
    
    setInstalling(server.name);
    
    try {
      const formData = {
        name: server.name,
        type: server.type,
        url: server.url || "",
        command: server.command || "",
        args: server.args || "",
        env: envValues,
        headers: server.headers
      };
      
      const success = await onAddServer(formData);
      if (success) {
        setConfiguring(null);
        setEnvValues({});
      }
    } finally {
      setInstalling(null);
    }
  };

  const cancelConfiguration = () => {
    setConfiguring(null);
    setEnvValues({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Browse MCP Servers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Pre-configured MCP Servers
          </DialogTitle>
          <DialogDescription>
            Choose from curated MCP servers to add to your Claude Code configuration.
            <a 
              href="https://docs.anthropic.com/en/docs/claude-code/mcp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
            >
              View documentation <ExternalLink className="h-3 w-3" />
            </a>
          </DialogDescription>
        </DialogHeader>
        
        {configuring ? (
          <div className="space-y-4 py-4">
            {(() => {
              const server = MCP_SERVER_PRESETS.find(s => s.name === configuring);
              if (!server) return null;
              
              return (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Configure {server.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This server requires environment variables to be configured.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {server.envVars?.map(envVar => (
                      <div key={envVar.key} className="grid gap-2">
                        <Label htmlFor={envVar.key}>{envVar.key}</Label>
                        <Input
                          id={envVar.key}
                          type={envVar.isSecret ? "password" : "text"}
                          placeholder={envVar.placeholder}
                          value={envValues[envVar.key] || ""}
                          onChange={(e) => setEnvValues(prev => ({ 
                            ...prev, 
                            [envVar.key]: e.target.value 
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      onClick={() => handleConfigureAndInstall(server)}
                      disabled={installing === server.name || !server.envVars?.every(env => envValues[env.key]?.trim())}
                    >
                      {installing === server.name ? (
                        "Installing..."
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Install Server
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={cancelConfiguration}>
                      Cancel
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3">{category}</h3>
                <div className="grid gap-3">
                  {MCP_SERVER_PRESETS
                    .filter(server => server.category === category)
                    .map(server => (
                      <Card key={server.name} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {server.name}
                                <Badge variant="outline" className="text-xs">
                                  {server.type.toUpperCase()}
                                </Badge>
                                {server.envVars && server.envVars.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Settings className="h-3 w-3 mr-1" />
                                    Config Required
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {server.description}
                              </CardDescription>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInstallServer(server)}
                              disabled={installing === server.name}
                              className="shrink-0"
                            >
                              {installing === server.name ? (
                                "Installing..."
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        {(server.envVars && server.envVars.length > 0) && (
                          <CardContent className="pt-0">
                            <div className="text-xs text-muted-foreground">
                              <strong>Required environment variables:</strong> {server.envVars.map(env => env.key).join(", ")}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}