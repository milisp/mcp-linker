import { ServerWorkspace } from "@/components/server/ServerWorkspace";
import { ServerCard as SharedServerCard } from "@/components/shared/ServerCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRepoUrlStore } from "@/stores/repoUrl";
import { ConfigType } from "@/types/mcpConfig";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ServerCardProps {
  serverKey: string;
  config: ConfigType["mcpServers"][string];
  onDelete: (key: string) => void;
}

export function ServerCard({
  serverKey,
  config,
  onDelete,
}: ServerCardProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const setRepoUrl = useRepoUrlStore((state) => state.setRepoUrl);

  // Construct GitHub URL from serverKey
  const githubUrl = `https://github.com/${serverKey}`;

  return (
    <SharedServerCard
      serverKey={serverKey}
      config={config}
      onDelete={onDelete}
      contentClassName="px-3 pb-3"
      primaryAction={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setRepoUrl(githubUrl)}>
              <span>{t("get")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("get")} {serverKey}
              </DialogTitle>
            </DialogHeader>
            <ServerWorkspace
              server={{
                id: `saved:${serverKey}`,
                name: serverKey,
                description: "",
                source: "saved",
                isOfficial: false,
                isFavorited: false,
                configs: [config],
              }}
              onSaved={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      }
    />
  );
}
