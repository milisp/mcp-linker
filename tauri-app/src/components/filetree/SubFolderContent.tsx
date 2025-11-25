import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FileTreeItem } from "./FileTreeItem";

interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  extension?: string;
}

interface SubFolderContentProps {
  folderPath: string;
  level: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onAddToChat: (path: string) => void;
  onFileClick: (path: string, isDirectory: boolean) => void;
  onSetWorkingFolder: (path: string) => void;
  onCalculateTokens: (path: string) => Promise<number | null>;
  isFiltered: (entry: FileEntry) => boolean;
  showAddButton?: boolean;
  onRemoveFromChat?: (path: string) => void;
  preventFileReplace?: boolean;
  shouldShowRemoveButton?: (path: string) => boolean;
  refreshKey?: number;
  refreshKeyMap?: Record<string, number>;
}

export function SubFolderContent({
  folderPath,
  level,
  expandedFolders,
  onToggleFolder,
  onAddToChat,
  onFileClick,
  onSetWorkingFolder,
  onCalculateTokens,
  isFiltered,
  showAddButton,
  onRemoveFromChat,
  preventFileReplace,
  shouldShowRemoveButton,
  refreshKey,
  refreshKeyMap,
}: SubFolderContentProps) {
  const [subEntries, setSubEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSubFolder = async () => {
      setLoading(true);
      try {
        const result = await invoke<FileEntry[]>("read_directory", {
          path: folderPath,
        });
        setSubEntries(result);
      } catch (err) {
        console.error("Failed to load subfolder:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSubFolder();
  }, [folderPath, refreshKey]);

  if (loading) {
    return (
      <div
        style={{ marginLeft: `${level * 16}px` }}
        className="text-sm text-gray-500"
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      {subEntries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          level={level}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
          onAddToChat={onAddToChat}
          onFileClick={onFileClick}
          onSetWorkingFolder={onSetWorkingFolder}
          onCalculateTokens={onCalculateTokens}
          isFiltered={isFiltered}
          showAddButton={showAddButton}
          onRemoveFromChat={shouldShowRemoveButton && shouldShowRemoveButton(entry.path) ? onRemoveFromChat : undefined}
          preventFileReplace={preventFileReplace}
          shouldShowRemoveButton={shouldShowRemoveButton}
          refreshKeyMap={refreshKeyMap}
        />
      ))}
    </>
  );
}
