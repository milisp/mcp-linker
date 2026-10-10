import { Dashboard } from "@/components/manage/Dashboard";
import { LocalTable } from "@/components/manage/LocalTable/index";
import { ServerTemplateDialog } from "@/components/server";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/stores/statsStore";
import { useViewStore } from "@/stores/viewStore";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Recently from "./recently";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function McpManage() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { personalStats } = useStatsStore();
  const { view, search, navigate } = useViewStore();
  const saved = view === "recently" || search.tab === "saved";

  const handleAddServer = () => {
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 bg-background text-foreground">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">MCP Server Management</h1>
          <span className="flex items-center gap-2">
            <Button
              className="flex"
              onClick={() => {
                navigate(0);
              }}
            >
              <RefreshCcw /> Refresh
            </Button>
            <Button onClick={handleAddServer}>{t("addCustomServer")}</Button>
          </span>
        </div>

        <Tabs value={saved ? "saved" : "installed"} onValueChange={value => navigate(value === "saved" ? "/manage?tab=saved" : "/manage")} className="mb-4">
          <TabsList><TabsTrigger value="installed">Installed</TabsTrigger><TabsTrigger value="saved">Saved Configurations</TabsTrigger></TabsList>
        </Tabs>
        {saved ? <Recently embedded /> : <>
        {/* Dashboard */}
        <Dashboard personalStats={personalStats} />

        <div className="flex-1 min-h-0">
          <LocalTable />
        </div>
        </>}
      </div>

      <ServerTemplateDialog
        isOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
      />
    </div>
  );
}
