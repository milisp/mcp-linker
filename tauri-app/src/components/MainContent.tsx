import { useFileViewerStore } from "@/hooks/useFileViewerStore";
import { FileViewer } from "./filetree/FileViewer";
import { ChatView } from "./chat/ChatView";

interface MainContentProps {
  currentTab: string;
}

export function MainContent({ currentTab }: MainContentProps) {
  const { selectedFile, setSelectedFile } = useFileViewerStore();

  if (currentTab === "files" && selectedFile) {
    // VSCode-like layout: FileViewer on left, ChatPane on right
    return (
      <div className="flex flex-1 h-full">
        <div className="flex-1 min-w-0">
          <FileViewer
            filePath={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        </div>
        <div className="w-96 border-l">
          <ChatView />
        </div>
      </div>
    );
  }

  // Default: just show ChatPane for other tabs or when no file selected
  return (
    <div className="flex-1">
      <ChatView />
    </div>
  );
}
