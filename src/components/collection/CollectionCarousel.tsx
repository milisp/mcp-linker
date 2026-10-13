import { Button } from "@/components/ui/button";
import type { CatalogCollection } from "@/data/mcp-servers/catalog";
import { useViewStore } from "@/stores/viewStore";
import type { ServerType } from "@/types";
import { ChevronLeft, ChevronRight, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Tile size and vertical offset per position, so the icons sit in a loose row.
const TILE_LAYOUT = [
  { size: "size-12", icon: "size-7", offset: "mt-0" },
  { size: "size-14", icon: "size-8", offset: "mt-6" },
  { size: "size-[4.5rem]", icon: "size-10", offset: "-mt-2" },
  { size: "size-12", icon: "size-7", offset: "mt-8" },
  { size: "size-14", icon: "size-8", offset: "mt-0" },
  { size: "size-12", icon: "size-7", offset: "mt-5" },
  { size: "size-14", icon: "size-8", offset: "-mt-1" },
];

// Bottom tint per slide, cycled.
const TINTS = [
  "to-emerald-100/70 dark:to-emerald-950/50",
  "to-sky-100/70 dark:to-sky-950/50",
  "to-amber-100/70 dark:to-amber-950/50",
  "to-rose-100/70 dark:to-rose-950/50",
  "to-violet-100/70 dark:to-violet-950/50",
];

function ServerTile({ server, index }: { server: ServerType; index: number }) {
  const [failed, setFailed] = useState(false);
  const layout = TILE_LAYOUT[index % TILE_LAYOUT.length];
  return (
    <span
      title={server.name}
      className={`flex shrink-0 items-center justify-center rounded-2xl border bg-white text-muted-foreground shadow-sm ${layout.size} ${layout.offset}`}
    >
      {server.logoUrl && !failed
        ? <img src={server.logoUrl} alt="" loading="lazy" className={`${layout.icon} object-contain`} onError={() => setFailed(true)} />
        : <Server className="size-5" />}
    </span>
  );
}

export function CollectionCarousel({ collections }: { collections: CatalogCollection[] }) {
  const { t } = useTranslation();
  const navigate = useViewStore(state => state.navigate);
  const [index, setIndex] = useState(0);
  const count = collections.length;
  const collection = collections[index % count];
  const go = (step: number) => setIndex(current => (current + step + count) % count);

  return (
    <section aria-roledescription="carousel" aria-label={t("collections.title")} className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card ${TINTS[index % TINTS.length]} px-14 py-8 text-center transition-colors`}>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t("collections.curated")}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{collection.title}</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{collection.description}</p>

        <div className="mx-auto mt-6 flex h-28 max-w-2xl items-start justify-center gap-4 sm:gap-8" aria-hidden>
          {collection.servers.slice(0, TILE_LAYOUT.length).map((server, i) => <ServerTile key={server.id} server={server} index={i} />)}
        </div>

        <Button variant="secondary" className="mt-4 bg-background/70 shadow-sm hover:bg-background" onClick={() => navigate(`/collections/${collection.id}`)}>
          {t("collections.explore")}
        </Button>

        {count > 1 && <>
          <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-background/70 shadow-sm hover:bg-background" aria-label={t("collections.previous")} onClick={() => go(-1)}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-background/70 shadow-sm hover:bg-background" aria-label={t("collections.next")} onClick={() => go(1)}>
            <ChevronRight className="size-5" />
          </Button>
        </>}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5">
          {collections.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
