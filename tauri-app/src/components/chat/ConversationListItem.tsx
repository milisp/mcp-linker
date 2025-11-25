import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  MoreVertical,
  Star,
  StarOff,
  FolderPlus,
  Pencil,
  Calendar,
} from "lucide-react";
import type { ConversationSummary } from "@/bindings/ConversationSummary";
import { formatSessionSource } from "@/utils/formatSessionSource";

export interface ConversationListItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  isFavorite: boolean;
  showBulkDeleteButtons: boolean;
  selectedConversations: Set<string>;
  setSelectedConversations: Dispatch<SetStateAction<Set<string>>>;
  onSelect: (conversation: ConversationSummary) => void;
  onToggleFavorite: (conversationId: string) => Promise<void>;
  onStartRename: () => void;
  onRequestCategoryAssignment?: () => void;
  onDelete: () => Promise<void>;
}

export function ConversationListItem({
  conversation,
  isActive,
  isFavorite,
  showBulkDeleteButtons,
  selectedConversations,
  setSelectedConversations,
  onSelect,
  onToggleFavorite,
  onStartRename,
  onRequestCategoryAssignment,
  onDelete,
}: ConversationListItemProps) {
  const isChecked = selectedConversations.has(conversation.conversationId);

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    setSelectedConversations((current) => {
      const next = new Set(current);
      if (checked === true) {
        next.add(conversation.conversationId);
      } else {
        next.delete(conversation.conversationId);
      }
      return next;
    });
  };

  const handleSelect = () => {
    onSelect(conversation);
  };

  return (
    <li>
      <DropdownMenu>
        <div className="flex items-center justify-between w-full">
          {showBulkDeleteButtons && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleCheckboxChange}
              className="mr-2"
            />
          )}
          <button
            onClick={handleSelect}
            className={`flex-1 min-w-0 truncate text-left rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            <span className="truncate">{conversation.preview}</span>
          </button>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async (event) => {
              event.stopPropagation();
              await onToggleFavorite(conversation.conversationId);
            }}
          >
            {isFavorite ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Remove favorite
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Add favorite
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onStartRename();
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onRequestCategoryAssignment?.();
            }}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Add to category
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async (event) => {
              event.stopPropagation();
              await onDelete();
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="flex gap-2 px-4 text-xs">
        <span className="flex gap-1"><Calendar size={12} />{conversation.timestamp?.split("T")[0]}</span>
        <span>•</span>
        <span>{formatSessionSource(conversation.source)}</span>
      </span>
    </li>
  );
}
