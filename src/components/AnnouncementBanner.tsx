import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Edited on the website repo (mcp-linker-hub/public/announcement.json), so
// promos and notices reach users without shipping a new app version
const ANNOUNCEMENT_URL = "https://mcp-linker.milisp.dev/announcement.json";
const DISMISSED_KEY = "mcp-linker-dismissed-announcements";

// Text fields are either a plain string or a map of i18n language code -> string
type Localized = string | Record<string, string>;

interface Announcement {
  id: string;
  message: Localized;
  url?: string;
  linkLabel?: Localized;
  startsAt?: string;
  expiresAt?: string;
}

const localize = (text: Localized | undefined, lang: string) => {
  if (text === undefined || typeof text === "string") return text;
  return text[lang] ?? text[lang.split("-")[0]] ?? text.en ?? Object.values(text)[0];
};

const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const isActive = (a: Announcement) => {
  const now = Date.now();
  if (a.startsAt && Date.parse(a.startsAt) > now) return false;
  if (a.expiresAt && Date.parse(a.expiresAt) <= now) return false;
  return true;
};

export function AnnouncementBanner() {
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  const { data } = useQuery({
    queryKey: ["announcement"],
    queryFn: async (): Promise<Announcement | null> => {
      const res = await fetch(ANNOUNCEMENT_URL, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      return json && typeof json.id === "string" && json.message ? json : null;
    },
    staleTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60,
    retry: false,
  });

  if (!data || dismissed.includes(data.id) || !isActive(data)) return null;

  const message = localize(data.message, i18n.language);
  const linkLabel = localize(data.linkLabel, i18n.language) ?? t("announcement.learnMore");

  const dismiss = () => {
    const next = [...dismissed, data.id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  return (
    <div className="flex shrink-0 items-center gap-3 border-b bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm text-white">
      <Megaphone className="size-4 shrink-0" aria-hidden />
      <p className="flex-1">{message}</p>
      {data.url && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 shrink-0"
          onClick={() => openUrl(data.url!)}
        >
          {linkLabel}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0 text-white hover:bg-white/20 hover:text-white"
        aria-label={t("announcement.dismiss")}
        title={t("announcement.dismiss")}
        onClick={dismiss}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
