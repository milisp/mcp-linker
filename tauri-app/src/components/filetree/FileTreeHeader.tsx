import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FileTreeHeaderProps {
  currentFolder?: string;
  filterText: string;
  onFilterTextChange: (text: string) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
  onRefresh: () => void;
  excludeFolders: string[];
}

export function FileTreeHeader({
  currentFolder,
  filterText,
  onFilterTextChange,
  onRefresh,
}: FileTreeHeaderProps) {
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showSearchInput) {
      searchInputRef.current?.focus();
    }
  }, [showSearchInput]);
  const getCurrentDirectoryName = () => {
    if (!currentFolder) return "Home";
    // Support both Unix (/) and Windows (\) path separators
    const parts = currentFolder.split(/[/\\]+/);
    return parts.pop() || currentFolder;
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <Folder className="w-4 h-4 text-blue-500" />
          <span
            className="text-sm font-medium text-gray-700 truncate"
            title={currentFolder || "Home"}
          >
            {getCurrentDirectoryName()}
          </span>
        </div>

        <span className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            title="Refresh directory"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowSearchInput(!showSearchInput)}
          >
            <Search className="w-3 h-3" />
          </Button>
        </span>
      </div>

      {showSearchInput &&
        <Input
          placeholder="Search files or folders..."
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          ref={searchInputRef}
          className="text-sm"
        />
      }
    </div>
  );
}
