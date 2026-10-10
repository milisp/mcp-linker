import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ServerType } from "@/types";
import { forwardRef } from "react";
import { useViewStore } from "@/stores/viewStore";
import { ServerWorkspace } from "../ServerWorkspace";

interface ServerConfigDialogProps {
  isOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  currentServer: ServerType;
}

export const ServerConfigDialog = forwardRef<HTMLDivElement, ServerConfigDialogProps>(({ isOpen, setIsDialogOpen, currentServer }, ref) => {
  const navigate = useViewStore(state => state.navigate);
  return <Dialog open={isOpen} onOpenChange={setIsDialogOpen}>
    <DialogContent ref={ref} className="overflow-y-auto max-h-[90vh] w-[90vw] sm:max-w-3xl">
      <DialogHeader><DialogTitle>{currentServer.name}</DialogTitle><DialogDescription>{currentServer.description || "Configure the connection and inspect available tools."}</DialogDescription></DialogHeader>
      <ServerWorkspace server={currentServer} onSaved={() => setIsDialogOpen(false)} onOpenDetails={currentServer.id ? () => { setIsDialogOpen(false); navigate(`/servers/${encodeURIComponent(currentServer.id)}`); } : undefined} />
    </DialogContent>
  </Dialog>;
});
ServerConfigDialog.displayName = "ServerConfigDialog";
