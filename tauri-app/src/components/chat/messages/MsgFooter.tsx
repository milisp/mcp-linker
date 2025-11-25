import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNoteStore } from "@/stores/useNoteStore";
import { BookOpen, Check, Copy, Plus, Undo2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface MsgFooterProps {
  content: string;
  align: "start" | "end";
  metaInfo?: string | null;
  onUndo?: () => void;
  canUndo?: boolean;
}

export function MsgFooter({
  content,
  align,
  metaInfo,
  onUndo,
  canUndo,
}: MsgFooterProps) {
  const [copied, setCopied] = useState(false);
  const { addContentToNote, createNoteFromContent, notes } = useNoteStore();

  const truncatedNoteTitle = useMemo(() => content.trim().split("\n")[0], [
    content,
  ]);

  const handleAddToNote = useCallback(
    (noteId: string) => {
      addContentToNote(noteId, content, "Chat Message");
    },
    [addContentToNote, content]
  );

  const handleCreateNote = useCallback(() => {
    createNoteFromContent(content, "Chat Message");
  }, [content, createNoteFromContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn("flex items-center gap-2", {
        "justify-end": align === "end",
        "justify-start": align === "start",
      })}
    >
      {metaInfo && (
        <span className="text-xs text-muted-foreground">{metaInfo}</span>
      )}
      {onUndo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-secondary dark:hover:bg-white/10 transition-colors"
          onClick={onUndo}
          disabled={canUndo === false}
        >
          <Undo2 size={6} />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-secondary dark:hover:bg-white/10 transition-colors"
          >
            <BookOpen size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Save message to note</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleCreateNote();
            }}
            className="gap-2"
          >
            <Plus size={14} />
            Create new note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {notes.length > 0 ? (
            notes.map((note) => (
              <DropdownMenuItem
                key={note.id}
                className="gap-2"
                onSelect={(event) => {
                  event.preventDefault();
                  handleAddToNote(note.id);
                }}
              >
                <span className="truncate max-w-[180px] text-sm font-medium">
                  {note.title || truncatedNoteTitle || "Untitled note"}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="opacity-70 cursor-not-allowed">
              No notes available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-secondary dark:hover:bg-white/10 transition-colors"
        onClick={handleCopy}
      >
        {copied ? <Check size={6} /> : <Copy size={6} />}
      </Button>
    </div>
  );
}
