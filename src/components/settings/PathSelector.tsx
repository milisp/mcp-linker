import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientPathStore } from "@/stores/clientPathStore";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

export function PathSelector() {
  const { selectedPath, setSelectedPath, selectedClient } =
    useClientPathStore();
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
          value={selectedPath || ""} // Display empty string if null
          onChange={(e) => setSelectedPath(e.target.value || null)} // Set to null if empty
          className="flex-1"
          placeholder={
            selectedClient === "custom"
              ? "Select a directory containing mcp.json"
              : "Select a project root or empty"
          }
          readOnly
        />
        <Button onClick={handleBrowse} disabled={isLoading}>
          {isLoading ? "Loading..." : "Browse"}
        </Button>
      </div>
    </div>
  );
}
