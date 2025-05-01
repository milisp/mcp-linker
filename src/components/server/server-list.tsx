// AppList.tsx (updated)
import { Input } from "@/components/ui/input";
import type { ServerType } from "@/types";
import { useEffect, useRef, useState } from "react";
import { ServerConfigDialog } from "./ServerConfigDialog";
import { ServerCard } from "./server-card";

interface AppListProps {
  selectedApp: string;
  selectedPath: string;
  mcpServers: ServerType[];
}

export function ServerList({
  selectedApp,
  selectedPath,
  mcpServers,
}: AppListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<ServerType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const favs = JSON.parse(
      localStorage.getItem("favorites") || "[]",
    ) as string[];
    setFavorites(favs);
  }, []);

  function toggleFavorite(source: string) {
    setFavorites((prev) => {
      let updated;
      if (prev.includes(source)) {
        console.log("[ToggleFavorite] Removing", source);
        updated = prev.filter((item) => item !== source);
      } else {
        console.log("[ToggleFavorite] Adding", source);
        updated = [...prev, source];
      }
      console.log("[ToggleFavorite] Updated favorites:", updated);
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  }

  function isFavorited(source: string) {
    return favorites.includes(source);
  }

  const openDialog = (server: ServerType) => {
    setCurrentServer(server);
    setIsDialogOpen(true);
  };

  return (
    <div ref={containerRef} className="h-full">
      <Input
        type="text"
        placeholder="Search servers by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mcpServers
          .filter(
            (server) =>
              server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              server.description
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
          )
          .map((app) => (
            <ServerCard
              key={`${app.name}-${app.source}`}
              app={app}
              onOpenDialog={openDialog}
              isFavorited={isFavorited(app.source)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
      </div>

      {currentServer && (
        <ServerConfigDialog
          isOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          currentServer={currentServer}
          selectedApp={selectedApp}
          selectedPath={selectedPath}
          mcpServers={mcpServers}
        />
      )}
    </div>
  );
}
