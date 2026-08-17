import { Github } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFavoriteServers } from "@/stores/favoriteServers";
import { useViewStore } from "@/stores/viewStore";
import type { ServerType } from "@/types";
import { openUrl } from "@/utils/urlHelper";
import {
  Loader2,
  SquareArrowOutUpRight,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ServerCardProps {
  server: ServerType;
  onOpenDialog: (server: ServerType) => void;
  isFavorited: boolean;
  onDelete?: (id: string) => void;
}

export function ServerCard({
  server,
  onOpenDialog,
  isFavorited,
  onDelete,
}: ServerCardProps) {
  const { t } = useTranslation();
  const [isFavoriteLoading, setIiFavoriteLoading] = useState(false);
  const toggleFavorite = useFavoriteServers((state) => state.toggleFavorite);
  const { navigate } = useViewStore();

  const showGithubIcon =
    server.source && server.source.startsWith("https://github.com");

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user is authenticated
    setIiFavoriteLoading(true);
    try {
      toggleFavorite(server);
      toast.success(
        `Successfully ${isFavorited ? "removed from" : "added to"} favorites`,
      );
    } catch (e) {
      toast.error(JSON.stringify(e));
    } finally {
      setIiFavoriteLoading(false);
    }
  };

  return (
    <Card
      key={server.id}
      className="hover:shadow-lg transition-shadow relative py-2 group"
    >
      <CardHeader className="px-2 py-2 pb-0">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-start">
            <div className="bg-gray-100 rounded-full">
              {server.logoUrl ? (
                <img
                  src={server.logoUrl}
                  alt="icon"
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                showGithubIcon && <Github className="w-6 h-6" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openUrl(server.source);
                  }}
                  className="hover:underline text-left flex"
                  title={`open ${server.source}`}
                >
                  {server.name}
                  <SquareArrowOutUpRight size={10} />
                </button>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {server.developer}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              className="absolute top-3 right-3 bg-white/70 rounded-full p-1 hover:bg-yellow-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleToggleFavorite}
              disabled={isFavoriteLoading}
              title={isFavorited ? "Unfavorite" : "Favorite"}
            >
              {isFavoriteLoading ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : isFavorited ? (
                <Star size={20} className="text-yellow-400" />
              ) : (
                <StarOff size={20} className="text-gray-400" />
              )}
            </button>
            {onDelete && (
              <button
                className="absolute top-3 right-10 bg-white/70 rounded-full p-1 hover:bg-red-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(server.id);
                }}
                title="Delete Server"
              >
                <Trash2 size={20} className="text-red-500" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pt-0 pb-2 text-sm text-foreground max-h-24 overflow-y-scroll">
        {server.description || ""}
        {server.tools && server.tools?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {server.tools.map((tool) => (
              <span
                key={tool}
                className="bg-gray-100 text-xs text-muted-foreground px-2 py-0.5 rounded"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between px-4 pb-4">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {server.isOfficial && <span className="text-blue-600">🎖️</span>}
          {server.version && <span>v{server.version}</span>}
        </span>
        <span className="flex gap-2 ">
          <span className="group-hover:flex hidden group">
            <Button
              onClick={() => navigate(`/servers/${encodeURIComponent(server.id)}`)}
              variant="default"
            >
              {t("viewDetail")}
            </Button>
          </span>
          <Button onClick={() => onOpenDialog(server)} variant="default">
            {t("get")}
          </Button>
        </span>
      </CardFooter>
    </Card>
  );
}
