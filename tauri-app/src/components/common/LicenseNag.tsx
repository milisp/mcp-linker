import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Quote } from "@/data/quotes";
import { getRandomOfflineQuote } from "@/data/quotes";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/userStore";
import { useTier } from "@/hooks/useTier";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { useEffect, useMemo, useState } from "react";
// import { toast } from "sonner";

// type QuoteResponse = { text: string; author?: string };

const SESSION_FLAG = "mcp-linker-nag-dismissed";

/**
 * Gentle license reminder with a daily quote, similar to WinRAR's soft nag.
 * Shows for FREE/unknown tiers. Paid tiers (PRO/TEAM/others) won't see it.
 */
export function LicenseNag() {
  const { user, fetchUser } = useUserStore();
  const { isFree, hasActiveTrial, loading } = useTier();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);

  // Determine whether to show the nag based on tier
  const shouldShow = useMemo(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_FLAG)) {
      return false; // already dismissed this session
    }
    // Wait for user state to be known to avoid flashing for paid users
    if (loading || user === null) {
      return false;
    }
    // Show only if tier is FREE or missing AND no active trial
    return isFree && !hasActiveTrial;
  }, [user, loading, isFree, hasActiveTrial]);

  // Fetch current user once on mount if unknown
  useEffect(() => {
    if (!user && !loading) {
      fetchUser().catch(() => void 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch quote with online fallback to offline
  useEffect(() => {
    const load = async () => {
      // Open the dialog if conditions say so
      if (shouldShow) setOpen(true);

      // Try backend daily quote; fallback to offline
      try {
        const res = await api.get("/quotes/daily");
        if (res?.data?.text) {
          setQuote({ text: res.data.text, author: res.data.author });
          return;
        }
      } catch (_) {
        // ignore and use offline fallback
      }
      setQuote(getRandomOfflineQuote());
    };
    load();
  }, [shouldShow]);

  // Auto-dismiss if a paid tier (including LIFETIME/PRO/TEAM) is detected after opening
  useEffect(() => {
    if (open && !loading && (!isFree || hasActiveTrial)) {
      onDismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isFree, hasActiveTrial, loading]);

  const onDismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch (_) {
      // ignore storage errors
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onDismiss() : setOpen(v))}>
      <DialogContent className="min-w-[600px]">
        <DialogHeader>
          <DialogTitle>Support MCP‑Linker</DialogTitle>
          <DialogDescription>
            Upgrading removes this reminder and helps us maintain MCP‑Linker.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-md border p-3 bg-muted/40">
          <div className="text-sm font-medium mb-1">Today’s Quote</div>
          <blockquote className="text-sm italic text-muted-foreground break-words whitespace-pre-wrap max-h-28 overflow-y-auto pr-1">
            “{quote?.text || getRandomOfflineQuote().text}”
            {quote?.author ? (
              <span className="not-italic ml-2">— {quote.author}</span>
            ) : null}
          </blockquote>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Thanks for using MCP‑Linker! If you find it helpful, consider supporting development.
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onDismiss}>Maybe later</Button>
          <div className="flex gap-2">
            <Button onClick={() => openUrl("https://mcp-linker.store/pricing")}>Get Lifetime (One‑Time)</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openUrl("https://mcp-linker.store/pricing")}>Upgrade to Pro</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LicenseNag;
