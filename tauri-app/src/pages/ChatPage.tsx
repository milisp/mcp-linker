import { ChatView } from "@/components/chat/ChatView";
import { FileViewer } from "@/components/filetree/FileViewer";
import { useFileViewerStore } from "@/hooks/useFileViewerStore";

export default function ChatPage() {
  const { selectedFile, setSelectedFile } = useFileViewerStore();

  return (
    <div className="h-full flex">
      {selectedFile ? (
        <>
          {/* File content on the left */}
          <div className="flex-1 min-w-0">
            <FileViewer
              filePath={selectedFile}
              onClose={() => setSelectedFile(null)}
            />
          </div>
          {/* Chat on the right */}
          <div className="w-96 border-l">
            <ChatView />
          </div>
        </>
      ) : (
        /* Full width chat when no file selected */
        <div className="flex-1">
          <ChatView />
        </div>
      )}
    </div>
  );
}
