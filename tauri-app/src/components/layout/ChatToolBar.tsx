import { InitializeResponse } from "@/bindings/InitializeResponse";
import { useActiveConversationStore } from "@/stores/codex/useActiveConversationStore";
import { useChatInputStore } from "@/stores/codex/useChatInputStore";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { useFolderStore } from "@/stores/useFolderStore";
import { runCommand } from "@/utils/runCommand";
import { detectWebFramework } from "@/utils/webFrameworkDetection";
import { invoke } from "@tauri-apps/api/core";
import { BookOpen, Globe, PenSquare, Terminal } from "lucide-react";
import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const DEFAULT_DEV_URL = "http://localhost:3000";

export const ChatToolbar: React.FC = () => {
  const { cwd } = useCodexStore();
  const { showWebPreview, setWebPreviewUrl, showReview, setReview } =
    useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { clearAll, requestFocus } = useChatInputStore();
  const { setActiveConversationId, activeConversationId } = useActiveConversationStore();
  const initializeRequestedRef = React.useRef(false);

  const handleNewConversation = React.useCallback(() => {
    setActiveConversationId(null);
    clearAll();
    requestFocus();
    setReview(false)
  }, [setActiveConversationId, clearAll, requestFocus]);

  const handleToggleWebPreview = React.useCallback(async () => {
    if (showWebPreview) {
      setWebPreviewUrl(null);
      return;
    }

    let devUrl = DEFAULT_DEV_URL;

    if (currentFolder) {
      try {
        const frameworkInfo = await detectWebFramework(currentFolder);
        if (frameworkInfo) {
          devUrl = frameworkInfo.devUrl;
        }
      } catch (error) {
        console.error("Failed to detect web framework:", error);
      }
    }

    setWebPreviewUrl(devUrl);
  }, [showWebPreview, setWebPreviewUrl, currentFolder]);

  const handleRunCommand = React.useCallback(() => {
    if (activeConversationId) {
      runCommand(activeConversationId, cwd);
    }
  }, [activeConversationId, cwd]);

  const handleToggleReviewMode = React.useCallback(() => {
    setReview(!showReview);
  }, [setReview, showReview]);

  // Cmd/Ctrl+N shortcut for new conversation
  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewConversation();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleNewConversation]);

  React.useEffect(() => {
    const initializeClient = async () => {
      if (initializeRequestedRef.current) return;
      initializeRequestedRef.current = true;
      try {
        await invoke<InitializeResponse>("initialize_client");
      } catch (error) {
        console.error("Failed to initialize client", error);
        initializeRequestedRef.current = false;
      }
    };

    void initializeClient();
  }, []);

  return (
    <div className="flex justify-between gap-2 px-2 w-full">
      <span className="flex gap-2">
        <Button size="icon" onClick={handleNewConversation} title="New Conversation (Cmd/Ctrl+N)">
          <PenSquare />
        </Button>
        
        <Button
          size="icon"
          variant="secondary"
          onClick={handleRunCommand}
          disabled={!activeConversationId}
          title="Run Command"
        >
          <Terminal />
        </Button>
      </span>
      <Badge>{cwd}</Badge>
      <span className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleReviewMode}
          className={showReview ? "bg-accent" : ""}
          title="Toggle Review Mode"
          aria-pressed={showReview}
        >
          <BookOpen />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleWebPreview}
          className={showWebPreview ? "bg-accent" : ""}
          title="Toggle Web Preview"
        >
          <Globe />
        </Button>
      </span>
    </div>
  );
};
