import { Button } from "@/components/ui/button";
import { useFolderStore } from "@/stores/useFolderStore";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Clock, Download, FileText, FolderOpen, Home, Image, Music, Video } from "lucide-react";
import { useEffect, useState } from "react";

interface FoldersTabProps {
  onSwitchToFilesTab: () => void;
}

export const FoldersTab = ({ onSwitchToFilesTab }: FoldersTabProps) => {
  const { currentFolder, setCurrentFolder, folderHistory } = useFolderStore();
  const [defaultDirs, setDefaultDirs] = useState<string[]>([]);

  useEffect(() => {
    const loadDefaultDirectories = async () => {
      try {
        const dirs = await invoke<string[]>("get_default_directories");
        setDefaultDirs(dirs);
      } catch (error) {
        console.error("Failed to load default directories:", error);
      }
    };

    loadDefaultDirectories();
  }, []);

  const getFolderIcon = (path: string, index: number) => {
    const folderName = path.split("/").pop()?.toLowerCase() || "";
    
    if (index === 0) return <Home className="w-5 h-5" />; // Home directory
    if (folderName.includes("documents")) return <FileText className="w-5 h-5" />;
    if (folderName.includes("downloads")) return <Download className="w-5 h-5" />;
    if (folderName.includes("pictures")) return <Image className="w-5 h-5" />;
    if (folderName.includes("music")) return <Music className="w-5 h-5" />;
    if (folderName.includes("movies") || folderName.includes("videos")) return <Video className="w-5 h-5" />;
    
    return <FolderOpen className="w-5 h-5" />;
  };

  const handleFolderClick = (folderPath: string) => {
    console.info("handleFolderClick", folderPath)
    setCurrentFolder(folderPath);
    onSwitchToFilesTab();
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  async function openChatFolder() {
    try {
      const selectedFolder = await open({
        directory: true,
        multiple: false,
      });
      if (selectedFolder) {
        setCurrentFolder(selectedFolder)
        onSwitchToFilesTab();
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Quick Access Icons - 2 Rows */}
      <div className="p-3 border-b">
        <div className="grid grid-cols-3 gap-1">
          {defaultDirs.slice(0, 6).map((dir, index) => (
            <Button
              key={dir}
              variant="ghost"
              size="sm"
              className="h-12 flex flex-col gap-1 p-2 hover:bg-muted"
              onClick={() => handleFolderClick(dir)}
              title={dir.split("/").pop() || dir}
            >
              {getFolderIcon(dir, index)}
              <span className="text-xs truncate w-full">
                {index === 0 ? "Home" : dir.split("/").pop()}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <Button onClick={openChatFolder}>openChatFolder</Button>

      {/* Current Folder Display */}
      <div className="p-3 border-b bg-muted/30">
        <div className="text-xs text-muted-foreground mb-1">Current Folder</div>
        <div className="text-sm font-medium truncate" title={currentFolder || ""}>
          {currentFolder ? (currentFolder.split("/").pop() || "Home") : "No folder selected"}
        </div>
      </div>

      {/* Folder History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
            <Clock className="w-3 h-3" />
            <span>Recent Folders</span>
          </div>
          <div className="space-y-1">
            {folderHistory.map((historyItem) => (
              <Button
                key={historyItem.path}
                variant="ghost"
                className="w-full justify-start h-auto p-2 text-left"
                onClick={() => handleFolderClick(historyItem.path)}
              >
                <div className="flex items-center gap-2 w-full min-w-0">
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {historyItem.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {historyItem.path}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(historyItem.lastVisited)}
                  </div>
                </div>
              </Button>
            ))}
            {folderHistory.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No recent folders
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};