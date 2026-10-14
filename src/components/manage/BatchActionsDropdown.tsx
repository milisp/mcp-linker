import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <>
      {hasSelectedRows && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" >
              {t("manage.actions")} <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {handleBatchEnable && (
              <DropdownMenuItem
                onClick={() => handleBatchEnable()}
              >
                {t("manage.enableSelected")}
              </DropdownMenuItem>
            )}
            {handleBatchDisable && (
              <DropdownMenuItem
                onClick={() => handleBatchDisable()}
              >
                {t("manage.disableSelected")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleBatchDelete} disabled={isDeleting}>
              {t("manage.deleteSelected")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
};
