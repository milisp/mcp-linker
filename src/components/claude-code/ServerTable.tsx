import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Eye, Globe, Plus, RefreshCcw, Settings, Terminal, Trash2 } from "lucide-react";

interface Server {
  name: string;
  type: string;
  url?: string;
  command?: string;
}

interface ServerTableProps {
  servers: Server[];
  loading: boolean;
  onRefresh: () => void;
  onViewDetails: (serverName: string) => void;
  onRemoveServer: (serverName: string) => void;
  onAddServer: () => void;
}

export default function ServerTable({
  servers,
  loading,
  onViewDetails,
  onRemoveServer,
  onAddServer
}: ServerTableProps) {
  const getServerTypeIcon = (serverType: string) => {
    switch (serverType) {
      case "http":
      case "sse":
        return <Globe className="h-4 w-4" />;
      case "stdio":
        return <Terminal className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          MCP Servers
        </CardTitle>
        <CardDescription>
          Configured MCP servers for Claude Code CLI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCcw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading servers...</span>
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No MCP servers configured</h3>
            <p className="text-muted-foreground mb-4">
              Add your first MCP server to get started with Claude Code
            </p>
            <Button onClick={onAddServer}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Server
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URL/Command</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.name}>
                  <TableCell className="font-medium"><button type="button" className="text-left hover:underline" onClick={() => onViewDetails(server.name)}>{server.name}</button></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getServerTypeIcon(server.type)}
                      {server.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {server.url || server.command || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-gray-500" />
                      Configured
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(server.name)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Tools & details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Server</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{server.name}" from your Claude Code configuration?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onRemoveServer(server.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Server
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}