import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackendErrorPayload } from "@/utils/backendErrorListener";

interface BackendErrorDialogProps {
  error: BackendErrorPayload | null;
  onDismiss: () => void;
}

export function BackendErrorDialog({
  error,
  onDismiss,
}: BackendErrorDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(Boolean(error));
  }, [error]);

  if (!error) {
    return null;
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          onDismiss();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Backend error
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <p className="text-foreground">{error.message}</p>
            {error.code !== undefined ? (
              <p className="text-xs text-muted-foreground">
                Code: {error.code}
              </p>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onDismiss();
            }}
          >
            Dismiss
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
