import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X, Image, Music } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MediaAttachment } from '@/types/chat';

interface MediaAttachmentListProps {
  mediaAttachments: MediaAttachment[];
  onRemove: (id: string) => void;
}

export const MediaAttachmentList: React.FC<MediaAttachmentListProps> = ({
  mediaAttachments,
  onRemove,
}) => {
  if (mediaAttachments.length === 0) {
    return null;
  }

  return (
    <>
      {mediaAttachments.map((attachment) => (
        <TooltipProvider key={attachment.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 h-5 text-xs px-1.5 py-0"
              >
                {attachment.type === 'image' ? (
                  <Image className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                ) : (
                  <Music className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                )}
                <span className="truncate max-w-12">{attachment.name}</span>
                <button
                  className="ml-1 p-0.5 hover:bg-gray-300 rounded flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(attachment.id);
                  }}
                  type="button"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p>{attachment.path}</p>
                <p className="text-gray-500 mt-1">{attachment.type} • {attachment.mimeType}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </>
  );
};