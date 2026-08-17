import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import React from "react";

interface LocalTableHeaderProps {
  isSyncing: boolean;
  onLocalSync: () => void;
}

export const LocalTableHeader: React.FC<LocalTableHeaderProps> = ({
  isSyncing,
  onLocalSync,
}) => {
  return (
    <div className="flex gap-3 items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onLocalSync}
        disabled={isSyncing}
        className="flex items-center gap-2 hover:bg-accent hover:border-accent-foreground"
      >
        <Monitor className="h-4 w-4" />
        Local Sync
      </Button>
    </div>
  );
};
