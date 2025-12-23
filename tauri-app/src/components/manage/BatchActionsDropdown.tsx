import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTier } from "@/hooks/useTier";
import { useGlobalDialogStore } from "@/stores/globalDialogStore";
import { ChevronDownIcon } from "@radix-ui/react-icons";

interface BatchActionsDropdownProps {
  handleBatchEnable?: () => void;
  handleBatchDisable?: () => void;
  handleBatchDelete: () => void;
  isDeleting: boolean;
  hasSelectedRows: boolean;
}

export const BatchActionsDropdown = ({
  handleBatchEnable,
  handleBatchDisable,
  handleBatchDelete,
  isDeleting,
  hasSelectedRows,
}: BatchActionsDropdownProps) => {
  const { hasMinimumTier } = useTier();
  const showGlobalDialog = useGlobalDialogStore((s) => s.showDialog);

  // Enable/disable servers instantly requires LIFETIME or higher
  const canToggle = hasMinimumTier("LIFETIME") || import.meta.env.DEV;

  const handleEnableClick = () => {
    if (!canToggle) {
      showGlobalDialog("upgrade");
      return;
    }
    handleBatchEnable?.();
  };

  const handleDisableClick = () => {
    if (!canToggle) {
      showGlobalDialog("upgrade");
      return;
    }
    handleBatchDisable?.();
  };

  return (
    <>
      {hasSelectedRows && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {handleBatchEnable && (
              <DropdownMenuItem
                onClick={handleEnableClick}
                disabled={!canToggle}
                className={!canToggle ? "opacity-50" : ""}
              >
                Enable Selected {!canToggle && "🔒"}
              </DropdownMenuItem>
            )}
            {handleBatchDisable && (
              <DropdownMenuItem
                onClick={handleDisableClick}
                disabled={!canToggle}
                className={!canToggle ? "opacity-50" : ""}
              >
                Disable Selected {!canToggle && "🔒"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleBatchDelete} disabled={isDeleting}>
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
};
