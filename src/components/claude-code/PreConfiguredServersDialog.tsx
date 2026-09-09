import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Plus, ExternalLink, Settings } from "lucide-react";
import { useState } from "react";

interface MCPServer {
  name: string;
  description: string;
  category: string;
  type: "http" | "sse" | "stdio";
  url?: string;
  command?: string;
  args?: string;
  envVars?: { key: string; placeholder: string }[];
}

const MCP_SERVERS: MCPServer[] = [
  // Development & Testing Tools
  {
    name: "sentry",
    description: "Monitor errors, debug production issues",
    category: "Development & Testing",
    type: "http",
    url: "https://mcp.sentry.dev/mcp"
  },
  {
    name: "socket",
    description: "Security analysis for dependencies",
    category: "Development & Testing",
    type: "http",
    url: "https://mcp.socket.dev/"
  },
  {
    name: "parallel-search",
    description: "Opt in by clicking Add. User-provided search objectives, search queries, and requested URLs are sent to Parallel.",
    category: "Development & Testing",
    type: "http",
    url: "https://search.parallel.ai/mcp"
  },
  
  // Project Management & Documentation
  {
    name: "asana",
    description: "Interact with your Asana workspace to keep projects on track",
    category: "Project Management",
    type: "sse",
    url: "https://mcp.asana.com/sse"
  },
  {
    name: "atlassian",
    description: "Manage your Jira tickets and Confluence docs",
    category: "Project Management",
    type: "sse",
    url: "https://mcp.atlassian.com/v1/sse"
  },
  {
    name: "clickup",
    description: "Task management, project tracking",
    category: "Project Management",
    type: "stdio",
    command: "npx",
    args: "-y @hauptsache.net/clickup-mcp",
    envVars: [
      { key: "CLICKUP_API_KEY", placeholder: "YOUR_CLICKUP_API_KEY" },
      { key: "CLICKUP_TEAM_ID", placeholder: "YOUR_TEAM_ID" }
    ]
  },
  {
    name: "intercom",
    description: "Access real-time customer conversations, tickets, and user data",
    category: "Project Management",
    type: "http",
    url: "https://mcp.intercom.com/mcp"
  },
  {
    name: "linear",
    description: "Integrate with Linear's issue tracking and project management",
    category: "Project Management",
    type: "sse",
    url: "https://mcp.linear.app/sse"
  },
  {
    name: "notion",
    description: "Read docs, update pages, manage tasks",
    category: "Project Management",
    type: "http",
    url: "https://mcp.notion.com/mcp"
  },
  
  // Database & Data Management
  {
    name: "airtable",
    description: "Read/write records, manage bases and tables",
    category: "Database & Data",
    type: "stdio",
    command: "npx",
    args: "-y airtable-mcp-server",
    envVars: [
      { key: "AIRTABLE_API_KEY", placeholder: "YOUR_AIRTABLE_API_KEY" }
    ]
  },

  // Payments & Commerce
  {
    name: "paypal",
    description: "Integrate PayPal commerce capabilities, payment processing, transaction management",
    category: "Payments & Commerce",
    type: "http",
    url: "https://mcp.paypal.com/mcp"
  },
  {
    name: "stripe",
    description: "Payment processing, subscription management, and financial transactions",
    category: "Payments & Commerce",
    type: "http",
    url: "https://mcp.stripe.com"
  },
  {
    name: "square",
    description: "Use an agent to build on Square APIs. Payments, inventory, orders, and more",
    category: "Payments & Commerce",
    type: "sse",
    url: "https://mcp.squareup.com/sse"
  },
  {
    name: "plaid",
    description: "Analyze, troubleshoot, and optimize Plaid integrations. Banking data, financial account linking",
    category: "Payments & Commerce",
    type: "sse",
    url: "https://api.dashboard.plaid.com/mcp/sse"
  },

  // Design & Media
  {
    name: "figma",
    description: "Access designs, export assets (Requires Figma Desktop with Dev Mode MCP Server)",
    category: "Design & Media",
    type: "sse",
    url: "http://127.0.0.1:3845/sse"
  },
  {
    name: "invideo",
    description: "Build video creation capabilities into your applications",
    category: "Design & Media",
    type: "sse",
    url: "https://mcp.invideo.io/sse"
  },

  // Infrastructure & DevOps
  {
    name: "cloudflare",
    description: "Build applications, analyze traffic, monitor performance, and manage security settings",
    category: "Infrastructure & DevOps",
    type: "http",
    url: "https://mcp.cloudflare.com/mcp"
  },

  // Automation & Integration
  {
    name: "workato",
    description: "Access any application, workflows or data via Workato, made accessible for AI",
    category: "Automation & Integration",
    type: "sse",
    url: "https://mcp.workato.com/sse"
  },
  {
    name: "zapier",
    description: "Connect to nearly 8,000 apps through Zapier's automation platform",
    category: "Automation & Integration",
    type: "http",
    url: "https://mcp.zapier.com/mcp"
  }
];

interface PreConfiguredServersDialogProps {
  onAddServer: (formData: any) => Promise<boolean>;
}

export default function PreConfiguredServersDialog({ onAddServer }: PreConfiguredServersDialogProps) {
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  const categories = Array.from(new Set(MCP_SERVERS.map(server => server.category)));

  const handleInstallServer = async (server: MCPServer) => {
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
        args: server.args || ""
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

  const handleConfigureAndInstall = async (server: MCPServer) => {
    if (installing) return;
    
    setInstalling(server.name);
    
    try {
      const formData = {
        name: server.name,
        type: server.type,
        url: server.url || "",
        command: server.command || "",
        args: server.args || "",
        env: envValues
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
            Choose from official MCP servers to add to your Claude Code configuration.
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
              const server = MCP_SERVERS.find(s => s.name === configuring);
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
                  {MCP_SERVERS
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