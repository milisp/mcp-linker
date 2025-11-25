import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useFolderStore } from "@/stores/useFolderStore";
import {
  ChevronDown,
  ChevronRight,
  FolderCheck,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { getFileIcon } from "./FileIcons";
import { SubFolderContent } from "./SubFolderContent";

interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  extension?: string;
  relativePath?: string;
}

interface FileTreeItemProps {
  entry: FileEntry;
  level?: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onAddToChat: (path: string) => void;
  onFileClick: (path: string, isDirectory: boolean) => void;
  onSetWorkingFolder: (path: string) => void;
  onCalculateTokens: (path: string) => Promise<number | null>;
  isFiltered: (entry: FileEntry) => boolean;
  showAddButton?: boolean;
  onRemoveFromChat?: (path: string) => void;
  disableSubFolderExpansion?: boolean;
  preventFileReplace?: boolean;
  shouldShowRemoveButton?: (path: string) => boolean;
  refreshKeyMap?: Record<string, number>;
}

export function FileTreeItem({
  entry,
  level = 0,
  expandedFolders,
  onToggleFolder,
  onAddToChat: _onAddToChat,
  onFileClick,
  onSetWorkingFolder,
  onCalculateTokens,
  isFiltered,
  showAddButton = true,
  onRemoveFromChat,
  preventFileReplace = false,
  shouldShowRemoveButton,
  refreshKeyMap,
}: FileTreeItemProps) {
  const [tokens, setTokens] = useState<number | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  
  const { setInputValue, requestFocus } = useChatInputStore();
  const { currentFolder } = useFolderStore();

  const getRelativePath = (fullPath: string): string => {
    if (!currentFolder) return fullPath;
    
    // Remove current folder path to get relative path
    if (fullPath.startsWith(currentFolder)) {
      const relativePath = fullPath.slice(currentFolder.length);
      // Handle both Unix (/) and Windows (\) path separators
      return (relativePath.startsWith('/') || relativePath.startsWith('\\')) 
        ? relativePath.slice(1) 
        : relativePath;
    }
    return fullPath;
  };

  const appendTokenToInput = (relativePath: string) => {
    if (!relativePath) return;

    const { inputValue } = useChatInputStore.getState();
    const token = `\`${relativePath}\``;
    const needsSpace = inputValue.length > 0 && !/\s$/.test(inputValue);
    const updatedValue = inputValue.length > 0
      ? `${inputValue}${needsSpace ? ' ' : ''}${token}`
      : token;

    setInputValue(updatedValue);
  };

  const resolveRelativePath = () => entry.relativePath ?? getRelativePath(entry.path);

  const handleAddToChatInput = () => {
    const relativePath = resolveRelativePath();
    appendTokenToInput(relativePath);
    requestFocus();
  };

  const handleFileClickWithoutStore = () => {
    if (entry.is_directory) {
      onToggleFolder(entry.path);
    } else {
      onFileClick(entry.path, entry.is_directory);
    }
  };

  const handleMouseEnter = async () => {
    if (!entry.is_directory && tokens === null && !loadingTokens) {
      setLoadingTokens(true);
      const calculatedTokens = await onCalculateTokens(entry.path);
      setTokens(calculatedTokens);
      setLoadingTokens(false);
    }
  };

  const handleCopyRelativePath = async () => {
    const relativePath = resolveRelativePath();
    try {
      await navigator.clipboard.writeText(relativePath);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (isFiltered(entry)) return null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="group"
          style={{ paddingLeft: `${level * 4}px` }}
          onMouseEnter={handleMouseEnter}
        >
          <div className="flex items-center gap-0.5 py-1 px-1 hover:bg-accent rounded">
            {entry.is_directory && (
              <Button
                variant="ghost"
                size="icon"
                className="p-0.5 w-4 h-4"
                onClick={() => onToggleFolder(entry.path)}
              >
                {expandedFolders.has(entry.path) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            )}

            {getFileIcon(entry)}

            <span
              className="flex-1 text-sm cursor-pointer hover:text-primary"
              onClick={handleFileClickWithoutStore}
            >
              {entry.name}
            </span>

            {tokens !== null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      {tokens}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tokens} tokens</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {entry.is_directory && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 p-0.5 w-4 h-4 h-auto"
                      onClick={() => onSetWorkingFolder(entry.path)}
                    >
                      <FolderCheck className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set as working folder</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="flex items-center">
              {showAddButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-auto p-0.5 w-4 h-4"
                  onClick={handleAddToChatInput}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
              {onRemoveFromChat && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-auto p-0.5 w-4 h-4 text-destructive hover:text-destructive/80"
                  onClick={() => onRemoveFromChat(entry.path)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {entry.is_directory && expandedFolders.has(entry.path) && (
            <SubFolderContent
              folderPath={entry.path}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onAddToChat={_onAddToChat}
              onFileClick={onFileClick}
              onSetWorkingFolder={onSetWorkingFolder}
              onCalculateTokens={onCalculateTokens}
              isFiltered={isFiltered}
              showAddButton={showAddButton}
              onRemoveFromChat={onRemoveFromChat}
              preventFileReplace={preventFileReplace}
              shouldShowRemoveButton={shouldShowRemoveButton}
              refreshKey={refreshKeyMap ? (refreshKeyMap[entry.path] || 0) : 0}
              refreshKeyMap={refreshKeyMap}
            />
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyRelativePath}>
          Copy relative path
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
