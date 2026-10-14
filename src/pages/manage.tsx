import { Dashboard } from "@/components/manage/Dashboard";
import { LocalTable } from "@/components/manage/LocalTable/index";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientLabel as labelOf } from "@/lib/clients";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useStatsStore } from "@/stores/statsStore";
import { useViewStore } from "@/stores/viewStore";
import { Plus, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import Recently from "./recently";

export default function McpManage() {
  const { t } = useTranslation();
  const { personalStats } = useStatsStore();
  const { view, search, navigate } = useViewStore();
  const selectedClient = useClientPathStore(state => state.selectedClient);
  const clientLabel = labelOf(selectedClient);
  const saved = view === "recently" || search.tab === "saved";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("manage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {saved
              ? t("manage.savedSubtitle")
              : t("manage.subtitle", { client: clientLabel })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={t("manage.refresh")} title={t("manage.refresh")} onClick={() => navigate(0)}>
            <RefreshCcw />
          </Button>
          <Button onClick={() => navigate("/servers/new")}>
            <Plus />
            {t("addCustomServer")}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <Tabs value={saved ? "saved" : "installed"} onValueChange={value => navigate(value === "saved" ? "/manage?tab=saved" : "/manage")}>
          <TabsList>
            <TabsTrigger value="installed">{t("manage.installed")}</TabsTrigger>
            <TabsTrigger value="saved">{t("manage.saved")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {!saved && <Dashboard personalStats={personalStats} />}
      </div>

      {saved ? <Recently embedded /> : <LocalTable />}
    </div>
  );
}
