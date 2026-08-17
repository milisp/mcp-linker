import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
                onClick={() => handleBatchEnable()}
              >
                Enable Selected
              </DropdownMenuItem>
            )}
            {handleBatchDisable && (
              <DropdownMenuItem
                onClick={() => handleBatchDisable()}
              >
                Disable Selected
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
