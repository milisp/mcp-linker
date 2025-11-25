import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameDialogProps {
  open: boolean;
  initialValue: string;
  title?: string;
  label?: string;
  confirmText?: string;
  cancelText?: string;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}

// Simple reusable dialog for renaming or single text input confirmation.
export function RenameDialog({
  open,
  initialValue,
  title = "Rename",
  label = "Name",
  confirmText = "Save",
  cancelText = "Cancel",
  onOpenChange,
  onSubmit,
  onCancel,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
      // Focus and select when opened
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = value.trim();
            if (!next) return;
            onSubmit(next);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="rename-input">{label}</Label>
            <Input
              id="rename-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Escape") {
                  onCancel?.();
                  onOpenChange?.(false);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onCancel?.();
                onOpenChange?.(false);
              }}
            >
              {cancelText}
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RenameDialog;

