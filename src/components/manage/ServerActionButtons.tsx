import { DeleteAlertDialog } from "@/components/common/DeleteAlertDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfigType } from "@/types/mcpConfig";
import { PenSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ServerForm } from "./forms";

interface ServerActionButtonsProps {
  serverName: string;
  serverConfig: any;
  onEdit: (
    serverName: string,
    config: ConfigType["mcpServers"][string],
    isDisabled?: boolean,
  ) => void;
  onDelete: (serverName: string) => void;
  onEnable: (serverName: string) => Promise<void>;
  disabledServers?: Record<string, any>;
}

export function ServerActionButtons({
  serverName,
  serverConfig,
  onEdit,
  onDelete,
  onEnable,
  disabledServers,
}: ServerActionButtonsProps) {
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      {/* Edit Button */}
      <Dialog
        open={editingServer === serverName}
        onOpenChange={(open) => setEditingServer(open ? serverName : null)}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <PenSquare className="h-4 w-4" />
            <span className="sr-only">{t ? t("edit") : "Edit"}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t ? t("edit") : "Edit"} {serverName}
            </DialogTitle>
          </DialogHeader>
          <ServerForm
            config={serverConfig}
            onSubmit={(values) => {
              const isDisabled = !!disabledServers?.[serverName];
              onEdit(serverName, values, isDisabled);
              setEditingServer(null);
            }}
            buttonName={t ? t("save") : "Save"}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Button */}
      <DeleteAlertDialog
        itemName={`the server "${serverName}"`}
        onDelete={async () => {
          const isDisabled = !!disabledServers?.[serverName];
          if (isDisabled) {
            await onEnable(serverName);
            onDelete(serverName);
          } else {
            onDelete(serverName);
          }
        }}
      />
    </div>
  );
}
