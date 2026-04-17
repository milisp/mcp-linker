import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useViewStore } from "@/stores/viewStore";

interface MissingKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MissingKeyDialog = ({
  open,
  onOpenChange,
}: MissingKeyDialogProps) => {
  const { navigate } = useViewStore();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Missing Encryption Key</AlertDialogTitle>
          <AlertDialogDescription>
            To use cloud sync, please go to Settings and generate your
            encryption key.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate("/settings")}>
            Go to Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
