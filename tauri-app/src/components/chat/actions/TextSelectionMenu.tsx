import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTextSelection } from '@/hooks/useTextSelection';
import { useNoteStore } from '@/stores/useNoteStore';
import { Copy, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface TextSelectionMenuProps {}

export const TextSelectionMenu: React.FC<TextSelectionMenuProps> = () => {
  const { selectedText, selectionRange, hasSelection, clearSelection } = useTextSelection();
  const { notes, createNoteFromContent, addContentToNote, getCurrentNote } = useNoteStore();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const activeNote = getCurrentNote();

  useEffect(() => {
    if (hasSelection && selectionRange) {
      const rect = selectionRange.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setPosition({
        x: rect.left + scrollLeft + rect.width / 2,
        y: rect.top + scrollTop - 10
      });
    } else {
      setPosition(null);
      setIsOpen(false);
    }
  }, [hasSelection, selectionRange]);

  const formatMessageMetadata = () => {
    // Try to find message context from the selection
    let messageRole = 'unknown';
    let timestamp = Date.now();
    
    if (selectionRange) {
      // Look for message container to get context
      const messageContainer = selectionRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? selectionRange.commonAncestorContainer.parentElement?.closest('[data-message-role]')
        : (selectionRange.commonAncestorContainer as Element)?.closest('[data-message-role]');
      
      if (messageContainer) {
        messageRole = messageContainer.getAttribute('data-message-role') || 'unknown';
        const timestampAttr = messageContainer.getAttribute('data-message-timestamp');
        if (timestampAttr) {
          timestamp = parseInt(timestampAttr, 10);
        }
      }
    }
    
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString();
    const source = `Selected text from ${messageRole} - ${timeStr}`;
    return { content: selectedText, source };
  };

  const handleCopyText = async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
    clearSelection();
    setIsOpen(false);
  };

  const handleAddToCurrentNote = () => {
    if (activeNote && selectedText) {
      const { content, source } = formatMessageMetadata();
      addContentToNote(activeNote.id, content, source);
    }
    clearSelection();
    setIsOpen(false);
  };

  const handleCreateNewNote = () => {
    if (selectedText) {
      const { content, source } = formatMessageMetadata();
      createNoteFromContent(content, source);
    }
    clearSelection();
    setIsOpen(false);
  };

  const handleAddToNote = (noteId: string) => {
    if (selectedText) {
      const { content, source } = formatMessageMetadata();
      addContentToNote(noteId, content, source);
    }
    clearSelection();
    setIsOpen(false);
  };

  if (!hasSelection || !position) {
    return null;
  }

  return (
    <div 
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        pointerEvents: 'auto'
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleCopyText}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </Button>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
            >
              <FileText className="w-3 h-3 mr-1" />
              Add to Note
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-64 p-2" align="center">
            <div className="space-y-2">
              <div className="text-sm font-medium px-2">Add selected text to note</div>
              
              {/* Add to current note if one is active */}
              {activeNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={handleAddToCurrentNote}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add to "{activeNote.title}"
                </Button>
              )}
              
              {/* Create new note */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={handleCreateNewNote}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create new note
              </Button>
              
              {/* Add to existing note (show recent notes) */}
              {notes.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs text-gray-500 px-2 mb-1">Recent notes</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {notes
                      .filter(note => note.id !== activeNote?.id)
                      .slice(0, 5)
                      .map((note) => (
                        <Button
                          key={note.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => handleAddToNote(note.id)}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          <span className="truncate">{note.title}</span>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Arrow pointing down to selection */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700"></div>
        <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px"></div>
      </div>
    </div>
  );
};