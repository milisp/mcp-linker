import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServerType } from "@/types";
import { openUrl } from "@/utils/urlHelper";
import { Flame, Github, Star, StarOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ServerCardProps {
  app: ServerType;
  onOpenDialog: (server: ServerType) => void;
  isFavorited: boolean;
  onToggleFavorite: (source: string) => void;
}

export function ServerCard({
  app,
  onOpenDialog,
  isFavorited,
  onToggleFavorite,
}: ServerCardProps) {
  const { t } = useTranslation();
  return (
    <Card
      key={`${app.name}-${app.source}`}
      className="hover:shadow-lg transition-shadow relative p-4"
    >
      <button
        className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-600 active:scale-110 transition-transform z-20"
        onClick={(e) => {
          e.stopPropagation();
          console.log("[Button] Toggle favorite for:", app.source);
          onToggleFavorite(app.source);
        }}
        title={isFavorited ? "Unfavorite" : "Favorite"}
      >
        {isFavorited ? (
          <Star size={20} className="text-yellow-400" />
        ) : (
          <StarOff size={20} className="text-gray-400" />
        )}
      </button>

      <CardHeader className="space-y-3">
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-blue-500 hover:underline"
          onClick={() => openUrl(app.source || "")}
        >
          <CardTitle className="text-lg">{app.name}</CardTitle>
          <Github size={18} />
        </div>

        <div className="flex items-center gap-2 text-sm">
          {app.is_official && (
            <span className="text-green-500" title="Official">
              ✅ Official
            </span>
          )}
          {app.is_hot && (
            <span className="text-orange-500" title="Hot">
              <Flame size={16} />
            </span>
          )}
        </div>

        <CardDescription className="text-muted-foreground text-sm">
          By {app.developer}
        </CardDescription>

        <p className="text-sm text-foreground">{app.description || ""}</p>

        <div className="flex justify-center mt-4">
          <Button
            className="w-2/3"
            onClick={() => onOpenDialog(app)}
            variant="default"
          >
            {t("get")}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
