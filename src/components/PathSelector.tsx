import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { useClientPathStore } from "@/store/clientPathStore";

// Props no longer needed as we're using the store

export function PathSelector() {
  const { selectedPath, setSelectedPath } = useClientPathStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleBrowse = async () => {
    try {
      setIsLoading(true);
      const selectedPath = await open({
        directory: true,
        multiple: false,
      });

      if (selectedPath) {
        setSelectedPath(selectedPath);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex space-x-2">
        <Input
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          className="flex-1"
          placeholder="Select a project root or a directory containing mcp.json"
          readOnly
        />
        <Button onClick={handleBrowse} disabled={isLoading}>
          {isLoading ? "Loading..." : "Browse"}
        </Button>
      </div>
    </div>
  );
}
