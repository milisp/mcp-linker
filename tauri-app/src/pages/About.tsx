import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { open } from "@tauri-apps/plugin-shell";
import {
  Download,
  ExternalLink,
  Github,
  Globe,
  Heart,
  MessageCircle,
  Shield,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from "lucide-react";

export default function About() {
  const features = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "One-click Installation",
      description: "Install and configure MCP servers with a single click",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Multi-client Support",
      description:
        "Works with Claude Desktop, Cursor, VS Code, Cline, and more",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Secure Cloud Sync",
      description: "Encrypted backup and sync for Professional users",
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Cross-platform",
      description: "Available on macOS, Windows, and Linux",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Team Cloud Sync",
      description: "Encrypted sync and backup for teams (beta)",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => open("https://mcp-linker.store")}
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent underline"
          >
            MCP Linker
          </button>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Add, manage, and sync MCP (Model Context Protocol) servers across AI
          clients like Claude Desktop, Cursor, and Cline — all via a lightweight
          Tauri GUI with a built-in MCP server marketplace.
        </p>
      </div>

      {/* Simplified version for Tauri */}

      {/* Key Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Open Source
            </CardTitle>
            <CardDescription>
              Star us on GitHub if you find this useful!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                onClick={() => open("https://github.com/milisp/mcp-linker")}
                className="w-full"
              >
                <Github className="h-4 w-4 mr-2" />
                View on GitHub
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  open("https://github.com/milisp/mcp-linker/releases")
                }
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Latest
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Community & Support
            </CardTitle>
            <CardDescription>
              Get help and connect with other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                onClick={() => open("https://discord.gg/UqXeVqUKQq")}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Join Discord
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  open("https://github.com/milisp/mcp-linker/issues")
                }
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Report Issues
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technology Stack */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
          <CardDescription>
            Built with modern, reliable technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Tauri</Badge>
            <Badge variant="secondary">React</Badge>
            <Badge variant="secondary">shadcn/ui</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">Rust</Badge>
            <Badge variant="secondary">FastAPI</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Share with Friends */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Share with Friends
          </CardTitle>
          <CardDescription>
            Help more developers discover MCP Linker by sharing it!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() =>
                open(
                  "https://twitter.com/intent/tweet?text=Check%20out%20MCP%20Linker%20-%20the%20ultimate%20tool%20for%20managing%20MCP%20servers%20with%20a%20beautiful%20Tauri%20UI!%20https%3A%2F%2Fgithub.com%2Fmilisp%2Fmcp-linker",
                )
              }
              className="w-full"
            >
              <Globe className="h-4 w-4 mr-2" />
              Share on Twitter
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                open(
                  "https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/milisp/mcp-linker",
                )
              }
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share on LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t">
        <p className="text-muted-foreground">
          Made with <Heart className="h-4 w-4 inline text-red-500" /> by the MCP
          Linker team
        </p>
      </div>
    </div>
  );
}
