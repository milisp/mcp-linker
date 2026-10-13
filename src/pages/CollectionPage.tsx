import { ServerList } from "@/components/server";
import { findCollection } from "@/data/mcp-servers/catalog";
import { useViewStore } from "@/stores/viewStore";
import { useTranslation } from "react-i18next";

export function CollectionPage() {
  const { t } = useTranslation();
  const { params, navigate } = useViewStore();
  const collection = findCollection(params.id ?? "");

  if (!collection) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>{t("collections.notFound")}</p>
        <button type="button" className="mt-2 underline hover:text-foreground" onClick={() => navigate("/discover")}>{t("back")}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{t("collections.label")}</p>
        <h1 className="text-2xl font-bold tracking-tight">{collection.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{collection.description}</p>
      </header>
      <ServerList mcpServers={collection.servers} />
    </div>
  );
}
