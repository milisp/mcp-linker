import type { ConversationSummary } from "@/bindings/ConversationSummary";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import RenameDialog from "@/components/chat/RenameDialog";
import { Button } from "@/components/ui/button";
import { useResumeConversation } from "@/hooks/codex/useResumeConversation";
import { useActiveConversationStore } from "@/stores/codex/useActiveConversationStore";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import {
  loadProjectSessions,
  useConversationListStore,
} from "@/stores/codex/useConversationListStore";
import { renameConversation } from "@/utils/renameConversation";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

interface ConversationListProps {
  mode: string;
  searchQuery?: string;
  selectedCategoryId?: string | null;
  conversationCategoryMap?: Record<string, string | undefined>;
  onRequestCategoryAssignment?: (conversationId: string) => void;
  showBulkDeleteButtons: boolean;
  selectedConversations: Set<string>;
  setSelectedConversations: Dispatch<SetStateAction<Set<string>>>;
}

export function ConversationList({
  mode = "all",
  searchQuery = "",
  selectedCategoryId = null,
  conversationCategoryMap,
  onRequestCategoryAssignment,
  showBulkDeleteButtons,
  selectedConversations,
  setSelectedConversations,
}: ConversationListProps) {
  const {
    conversationsByCwd,
    favoriteConversationIdsByCwd,
    toggleFavorite,
    updateConversationPreview,
    removeConversation,
    loadedAllByCwd,
    hasMoreByCwd,
  } = useConversationListStore();
  const { activeConversationId } = useActiveConversationStore();
  const { cwd } = useCodexStore();
  const { handleSelectConversation } = useResumeConversation();
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingAllSessions, setIsLoadingAllSessions] = useState(false);

  useEffect(() => {
    if (!cwd) {
      setIsLoadingSessions(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSessions(true);
    loadProjectSessions(cwd)
      .catch(() => {
        /* swallow */
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cwd]);

  // No inline focus; handled by RenameDialog

  const favoriteIds = useMemo(() => {
    const list = favoriteConversationIdsByCwd[cwd || ""] ?? [];
    return new Set(list);
  }, [favoriteConversationIdsByCwd, cwd]);

  const conversations = useMemo(() => {
    const base = conversationsByCwd[cwd || ""] || [];
    const sorted = [...base].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
    const query = searchQuery.trim().toLowerCase();
    return sorted.filter((conv) => {
      if (mode === "favorites" && !favoriteIds.has(conv.conversationId)) {
        return false;
      }

      if (
        selectedCategoryId &&
        conversationCategoryMap &&
        conversationCategoryMap[conv.conversationId] !== selectedCategoryId
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return conv.preview.toLowerCase().includes(query);
    });
  }, [
    conversationsByCwd,
    cwd,
    mode,
    favoriteIds,
    searchQuery,
    selectedCategoryId,
    conversationCategoryMap,
  ]);

  const emptyStateMessage = useMemo(() => {
    if (searchQuery.trim()) {
      return "No conversations match your search.";
    }

    if (mode === "favorites") {
      return "No favorite conversations yet.";
    }

    return "No conversations yet.";
  }, [mode, searchQuery]);

  const loadedAll = loadedAllByCwd[cwd || ""] ?? false;
  const hasMore = hasMoreByCwd[cwd || ""] ?? false;

  const handleLoadAll = () => {
    if (!cwd || isLoadingAllSessions) {
      return;
    }

    setIsLoadingAllSessions(true);
    loadProjectSessions(cwd, true)
      .catch(() => {
        /* swallow */
      })
      .finally(() => {
        setIsLoadingAllSessions(false);
      });
  };

  const handleRenameSubmit = async (
    conversationId: string,
    nextPreview: string,
  ) => {
    await renameConversation({
      conversationId,
      nextPreview,
      cwd,
      conversations,
      updateConversationPreview,
    });
    setEditingConversationId(null);
  };

  const handleConversationSelect = (conversation: ConversationSummary) => {
    handleSelectConversation(conversation);
  };

  const handleDeleteConversation = async (
    conversation: ConversationSummary,
  ) => {
    if (!conversation.path) {
      return;
    }

    await removeConversation(conversation.conversationId);
    await invoke("delete_file", { path: conversation.path });
  };

  return (
    <nav className="flex flex-col h-full bg-muted/30">
      <div className="flex-1 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading conversations…</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.conversationId;
              const isFavorite = favoriteIds.has(conv.conversationId);
              return (
                <ConversationListItem
                  key={conv.conversationId}
                  conversation={conv}
                  isActive={isActive}
                  isFavorite={isFavorite}
                  showBulkDeleteButtons={showBulkDeleteButtons}
                  selectedConversations={selectedConversations}
                  setSelectedConversations={setSelectedConversations}
            onSelect={handleConversationSelect}
            onToggleFavorite={toggleFavorite}
                  onStartRename={() =>
                    setEditingConversationId(conv.conversationId)
                  }
                  onRequestCategoryAssignment={() =>
                    onRequestCategoryAssignment?.(conv.conversationId)
                  }
                  onDelete={() => handleDeleteConversation(conv)}
                />
              );
            })}
          </ul>
        )}
      </div>
      <RenameDialog
        open={editingConversationId !== null}
        initialValue={
          conversations.find((c) => c.conversationId === editingConversationId)
            ?.preview || ""
        }
        title="Rename Conversation"
        label="New name"
        onOpenChange={(open) => {
          if (!open) {
            setEditingConversationId(null);
          }
        }}
        onCancel={() => setEditingConversationId(null)}
        onSubmit={(value) => {
          if (editingConversationId) {
            void handleRenameSubmit(editingConversationId, value);
          }
        }}
      />
      {!loadedAll && hasMore ? (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleLoadAll}
            disabled={isLoadingAllSessions}
          >
            {isLoadingAllSessions ? (
              <span className="flex w-full justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading all
              </span>
            ) : (
              "Load all"
            )}
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
