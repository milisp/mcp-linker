import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Category {
  id: string;
  name: string;
}

interface ConversationCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const ConversationCategoryDialog: React.FC<ConversationCategoryDialogProps> = ({
  open,
  onOpenChange,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (!open) {
      setNewCategoryName("");
    }
  }, [open]);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategoryName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCategory();
                }
              }}
            />
            <Button size="sm" onClick={handleAddCategory}>
              Add
            </Button>
          </div>
          <div className="border rounded divide-y">
            <button
              className={`w-full text-left p-3 hover:bg-accent ${!selectedCategoryId ? "bg-accent/50" : ""}`}
              onClick={() => {
                onSelectCategory(null);
                onOpenChange(false);
              }}
            >
              All
            </button>
            {categories.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No categories yet.</div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center">
                  <button
                    className={`flex-1 text-left p-3 hover:bg-accent ${selectedCategoryId === cat.id ? "bg-accent/50" : ""}`}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onOpenChange(false);
                    }}
                  >
                    {cat.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-muted-foreground"
                    onClick={() => onDeleteCategory(cat.id)}
                    title="Delete category"
                  >
                    ×
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
