import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChatInputStore, type FileReference } from '@/stores/chatInputStore';
import { useSettingsStore } from '@/stores/settings/SettingsStore';
import { useCodexStore } from '@/stores/useCodexStore';
import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

interface FileSearchPopoverProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const FileSearchPopover: React.FC<FileSearchPopoverProps> = ({
  inputValue,
  onInputChange,
  textareaRef,
}) => {
  const {
    requestFocus,
    addFileReference,
  } = useChatInputStore();
  const { cwd } = useCodexStore();
  const { excludeFolders } = useSettingsStore();
  const [showFileSearchPopover, setShowFileSearchPopover] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileReference[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(-1);

  const searchFiles = async (query: string) => {
    try {
      const results = await invoke<FileReference[]>('search_files', {
        root: cwd,
        query,
        excludeFolders,
        maxResults: 50,
      });
      console.log("searchFiles result", results)
      setFilteredFiles(results.filter((file) => !file.is_directory));
      setSelectedFileIndex(0);
    } catch (error) {
      console.error('Failed to search files:', error);
      setFilteredFiles([]);
    }
  };

  // Effect to handle '@' trigger for file search popover
  useEffect(() => {
    const handleAtSymbol = async () => {
      const cursorPosition = textareaRef.current?.selectionStart;
      if (cursorPosition === undefined) return;

      const textBeforeCursor = inputValue.substring(0, cursorPosition);
      const atMatch = textBeforeCursor.match(/@([^\s]*)$/);

      if (atMatch) {
        setShowFileSearchPopover(true);
        const query = atMatch[1];
        setFileSearchQuery(query);

        await searchFiles(query);
      } else {
        setShowFileSearchPopover(false);
        setFileSearchQuery('');
        setFilteredFiles([]);
        setSelectedFileIndex(-1);
      }
    };

    void handleAtSymbol();
  }, [inputValue, cwd, textareaRef]);

  const handleFileSelection = (file: FileReference) => {
    const cursorPosition = textareaRef.current?.selectionStart;
    if (cursorPosition === undefined) return;

    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/);

    if (atMatch) {
      const startIndex = atMatch.index!;
      // Calculate relative path
      const relativePath = cwd && file.path.startsWith(cwd) ? file.path.substring(cwd.length + 1) : file.path;
      addFileReference(file.path, relativePath, file.name, file.is_directory);
      const newInputValue =
        inputValue.substring(0, startIndex) +
        `${relativePath} ` +
        inputValue.substring(cursorPosition);
      onInputChange(newInputValue);
      setShowFileSearchPopover(false);
      setFileSearchQuery('');
      setFilteredFiles([]);
      setSelectedFileIndex(-1);

      // Manually set cursor position after insertion
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = startIndex + `@${relativePath} `.length;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showFileSearchPopover) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedFileIndex((prevIndex) =>
        Math.min(prevIndex + 1, filteredFiles.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedFileIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const filepath = filteredFiles[selectedFileIndex]
      console.info("add", filepath, 'to textarea')
      if (selectedFileIndex !== -1 && filepath) {
        handleFileSelection(filepath);
        requestFocus();
      }
    } else if (e.key >= '0' && e.key <= '9') {
      const index = parseInt(e.key, 10);
      if (index < filteredFiles.length) {
        e.preventDefault();
        handleFileSelection(filteredFiles[index]);
      }
    } else if (e.key === 'Escape') {
      requestFocus();
      e.preventDefault();
      setShowFileSearchPopover(false);
    }
  };

  return (
    <Popover open={showFileSearchPopover} onOpenChange={setShowFileSearchPopover}>
      <PopoverTrigger asChild>
        {/* This is an invisible trigger, the popover is controlled by state */}
        <span className="absolute top-0 left-0 w-0 h-0" />
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder="Search files..."
            value={fileSearchQuery}
            onValueChange={async (value) => {
              setFileSearchQuery(value);
              const query = value;
              await searchFiles(query);
            }}
          />
          <CommandList>
            {filteredFiles.length === 0 ? (
              <div className="py-6 text-center text-sm">No files found.</div>
            ) : (
              filteredFiles.map((file, index) => {
                const relativePath = cwd && file.path.startsWith(cwd)
                  ? file.path.substring(cwd.length + 1)
                  : file.path;
                return (
                  <CommandItem
                    key={file.path}
                    onSelect={() => handleFileSelection(file)}
                    className={`flex items-center gap-2 cursor-pointer ${index === selectedFileIndex ? 'bg-accent text-accent-foreground' : ''}`}
                    value={relativePath}
                  >
                    <div className="flex flex-col">
                      <span>{file.name}</span>
                      <span className="text-xs text-muted-foreground">{relativePath}</span>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{index}</span>
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
