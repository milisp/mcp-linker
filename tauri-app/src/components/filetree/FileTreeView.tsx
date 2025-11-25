import { useFileTokens } from "@/hooks/useFileTokens";
import { useContextFilesStore } from "@/stores/ContextFilesStore";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { useFolderStore } from "@/stores/useFolderStore";
import { getErrorMessage } from "@/utils/errorUtils";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FileTreeHeader } from "./FileTreeHeader";
import { FileTreeItem } from "./FileTreeItem";

interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  extension?: string;
}

interface FileTreeProps {
  onAddToChat?: (path: string) => void;
  onFileClick?: (path: string) => void;
}

export function FileTree({
  onAddToChat,
  onFileClick,
}: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { excludeFolders } = useSettingsStore();
  const { setCurrentFolder, currentFolder } = useFolderStore();
  const { addFile, clearFiles } = useContextFilesStore();
  const { calculateTokens } = useFileTokens();

  const loadDirectory = async (path?: string) => {
    setLoading(true);
    setError(null);

    try {
      let targetPath = path || currentFolder;
      console.info("targetPath", path, currentFolder)
      if (!targetPath) {
        const defaultDirs = await invoke<string[]>("get_default_directories");
        targetPath = defaultDirs[0];
        setCurrentFolder(targetPath);
      }

      const result = await invoke<FileEntry[]>("read_directory", {
        path: targetPath,
      });
      setEntries(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (expandedFolders.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleAddToChat = (path: string) => {
    addFile(path);
    if (onAddToChat) {
      onAddToChat(path);
    }
  };

  const handleFileClick = (path: string, isDirectory: boolean) => {
    if (!isDirectory) {
      clearFiles();
      addFile(path);
      if (onFileClick) {
        onFileClick(path);
      }
    }
  };

  const handleSetWorkingFolder = (folderPath: string) => {
    setCurrentFolder(folderPath);
    setFilterText("");
    loadDirectory(folderPath);
  };

  const isFiltered = (entry: FileEntry): boolean => {
    // Always hide excluded folders in tree rendering
    if (entry.is_directory && excludeFolders.includes(entry.name)) return true;
    return false;
  };

  useEffect(() => {
    loadDirectory();
  }, [currentFolder]);

  // Global search across the entire file tree starting at currentFolder
  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      const query = filterText.trim();
      if (!query) {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);

        let targetPath = currentFolder;
        if (!targetPath) {
          const defaultDirs = await invoke<string[]>("get_default_directories");
          targetPath = defaultDirs[0];
          setCurrentFolder(targetPath);
        }

        const results = await invoke<FileEntry[]>("search_files", {
          root: targetPath,
          query,
          excludeFolders: excludeFolders,
          // keep defaults on backend if not provided
        });

        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Global search failed:", err);
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    // Debounce a bit to avoid spamming the backend while typing
    const timer = setTimeout(runSearch, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterText, currentFolder, excludeFolders]);

  if (loading && entries.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">Error: {error}</div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <FileTreeHeader
        currentFolder={currentFolder ?? undefined}
        filterText={filterText}
        onFilterTextChange={setFilterText}
        showFilter={showFilter}
        onToggleFilter={() => setShowFilter(!showFilter)}
        onRefresh={() => loadDirectory()}
        excludeFolders={excludeFolders}
      />

      <div className="flex-1 overflow-y-auto">
        {filterText.trim() ? (
          <>
            {isSearching &&
              entries.length === 0 &&
              searchResults.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">
                  Searching...
                </div>
              )}
            {searchResults.map((entry) => (
              <FileTreeItem
                key={entry.path}
                entry={entry}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onAddToChat={handleAddToChat}
                onFileClick={handleFileClick}
                onSetWorkingFolder={handleSetWorkingFolder}
                onCalculateTokens={calculateTokens}
                isFiltered={isFiltered}
              />
            ))}
            {!isSearching && searchResults.length === 0 && (
              <div className="p-2 text-xs text-muted-foreground">
                No matches found
              </div>
            )}
          </>
        ) : (
          entries.map((entry) => (
            <FileTreeItem
              key={entry.path}
              entry={entry}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onAddToChat={handleAddToChat}
              onFileClick={handleFileClick}
              onSetWorkingFolder={handleSetWorkingFolder}
              onCalculateTokens={calculateTokens}
              isFiltered={isFiltered}
            />
          ))
        )}
      </div>
    </div>
  );
}
