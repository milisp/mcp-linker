import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ServerForm } from "@/components/manage/ServerForm";
import { ConfigType } from "@/types/config";

interface ServerCardProps {
  serverKey: string;
  config: ConfigType["mcpServers"][string];
  onAdd: (key: string, config: ConfigType["mcpServers"][string]) => void;
  onDelete: (key: string) => void;
}

export function ServerCard({
  serverKey,
  config,
  onAdd,
  onDelete,
}: ServerCardProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete(serverKey);
    setDeleteDialogOpen(false);
  };

  return (
    <Card className="w-full max-w-xs border shadow rounded-lg">
      <CardHeader className="flex items-center justify-between pb-2 px-3 pt-3">
        <CardTitle className="text-base font-semibold truncate dark:text-white">
          {serverKey}
        </CardTitle>
        <div className="flex space-x-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <span>Get</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">
                  Get {serverKey}
                </DialogTitle>
              </DialogHeader>
              <ServerForm
                config={config}
                onSubmit={(values) => {
                  onAdd(serverKey, values);
                  setOpen(false);
                }}
                buttonName={"add"}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">
                  Confirm Deletion
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete {serverKey}?
              </p>
              <DialogFooter className="mt-4 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="mr-2"
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-2 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">Command:</span>
            <span className="text-muted-foreground break-words">
              {config.command}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
