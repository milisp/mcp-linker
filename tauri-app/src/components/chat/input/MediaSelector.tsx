import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatInputStore } from "@/stores/chatInputStore";
import { createMediaAttachment, isMediaFile } from "@/utils/mediaUtils";
import { open } from "@tauri-apps/plugin-dialog";
import { Image, Music, Paperclip } from "lucide-react";
import React from "react";

export const MediaSelector: React.FC = () => {
  const { addMediaAttachment } = useChatInputStore();

  const handleSelectMedia = async () => {
    try {
      const selected: string | string[] | null = await open({
        multiple: true,
        filters: [
          {
            name: "Media Files",
            extensions: [
              "jpg",
              "jpeg",
              "png",
              "gif",
              "bmp",
              "webp",
              "svg",
              "mp3",
              "wav",
              "ogg",
              "m4a",
              "aac",
              "flac",
            ],
          },
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"],
          },
          {
            name: "Audio",
            extensions: ["mp3", "wav", "ogg", "m4a", "aac", "flac"],
          },
        ],
      });

      if (selected) {
        if (Array.isArray(selected)) {
          for (const filePath of selected) {
            const filename = filePath.split(/[\\/]/).pop() || filePath;
            if (isMediaFile(filename)) {
              try {
                const mediaAttachment = await createMediaAttachment(filePath);
                addMediaAttachment(mediaAttachment);
              } catch (error) {
                console.error("Failed to create media attachment:", error);
              }
            }
          }
        } else {
          const filename =
            (selected as string).split(/[\\/]/).pop() || selected;
          if (isMediaFile(filename)) {
            try {
              const mediaAttachment = await createMediaAttachment(
                selected as string,
              );
              addMediaAttachment(mediaAttachment);
            } catch (error) {
              console.error("Failed to create media attachment:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectMedia}
              className="h-8 w-8 p-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2 text-xs">
              <Paperclip className="w-3 h-3" />
              Add media files
              <span className="text-gray-400">•</span>
              <Image className="w-3 h-3" />
              <Music className="w-3 h-3" />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
