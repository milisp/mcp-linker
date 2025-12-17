import { ConversationCategoryDialog } from "@/components/chat/ConversationCategoryDialog";
import { ConversationList } from "@/components/chat/ConversationList";
import { BulkDeleteButtons } from "@/components/chat/actions/BulkDeleteButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import { useConversationListStore } from "@/stores/codex/useConversationListStore";
import { Tags } from "lucide-react";
import { useMemo, useState } from "react";

interface Tab {
  value: string;
  mode: string;
}

export const ChatTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [dialogSelectedCategory, setDialogSelectedCategory] = useState<string | null>(null);
  const [conversationCategoryMap, setConversationCategoryMap] = useState<Record<string, string>>({});
  const [pendingCategoryConversation, setPendingCategoryConversation] = useState<string | null>(null);
  const [showBulkDeleteButtons, setShowBulkDeleteButtons] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const tabs: Tab[] = [
    { value: "all", mode: "all" },
    { value: "favorites", mode: "favorites" },
  ];
  const { conversationsByCwd } = useConversationListStore();
  const { cwd } = useCodexStore();

  const conversations = useMemo(() => {
    return (conversationsByCwd[cwd] || []).slice().reverse();
  }, [conversationsByCwd, cwd]);

  const handleOpenCategoryDialogForFilter = () => {
    setPendingCategoryConversation(null);
    setDialogSelectedCategory(selectedCategoryId);
    setIsCategoryDialogOpen(true);
  };

  const handleRequestCategoryAssignment = (conversationId: string) => {
    setPendingCategoryConversation(conversationId);
    setDialogSelectedCategory(conversationCategoryMap[conversationId] ?? null);
    setIsCategoryDialogOpen(true);
  };

  const handleSelectCategory = (categoryId: string | null) => {
    if (pendingCategoryConversation) {
      setConversationCategoryMap((prev) => {
        const next = { ...prev };
        if (categoryId) {
          next[pendingCategoryConversation] = categoryId;
        } else {
          delete next[pendingCategoryConversation];
        }
        return next;
      });
    } else {
      setSelectedCategoryId(categoryId);
    }
    setPendingCategoryConversation(null);
    setDialogSelectedCategory(categoryId);
  };

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newCategory = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: trimmed,
    };
    setCategories((prev) => [...prev, newCategory]);
    setDialogSelectedCategory(newCategory.id);
    if (pendingCategoryConversation) {
      setConversationCategoryMap((prev) => ({
        ...prev,
        [pendingCategoryConversation]: newCategory.id,
      }));
      setPendingCategoryConversation(null);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    setConversationCategoryMap((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([convId, assignedCategory]) => {
        if (assignedCategory !== categoryId) {
          next[convId] = assignedCategory;
        }
      });
      return next;
    });
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    }
    if (dialogSelectedCategory === categoryId) {
      setDialogSelectedCategory(null);
    }
    if (pendingCategoryConversation) {
      setPendingCategoryConversation(null);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCategoryDialogOpen(open);
    if (!open) {
      setPendingCategoryConversation(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations..."
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenCategoryDialogForFilter}
            title="Filter by category"
          >
            <Tags className="h-4 w-4" />
          </Button>
          <BulkDeleteButtons
            showBulkDeleteButtons={showBulkDeleteButtons}
            setShowBulkDeleteButtons={setShowBulkDeleteButtons}
            selectedConversations={selectedConversations}
            setSelectedConversations={setSelectedConversations}
            conversations={conversations}
          />
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        {tabs.map((tab: Tab) => (
          <TabsContent key={tab.value} value={tab.value} className="flex-1 mt-0">
            <ConversationList
              mode={tab.mode}
              searchQuery={searchQuery}
              selectedCategoryId={selectedCategoryId}
              conversationCategoryMap={conversationCategoryMap}
              onRequestCategoryAssignment={handleRequestCategoryAssignment}
              showBulkDeleteButtons={showBulkDeleteButtons}
              selectedConversations={selectedConversations}
              setSelectedConversations={setSelectedConversations}
            />
          </TabsContent>
        ))}
      </Tabs>
      <ConversationCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={handleDialogOpenChange}
        categories={categories}
        selectedCategoryId={dialogSelectedCategory}
        onSelectCategory={handleSelectCategory}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
};