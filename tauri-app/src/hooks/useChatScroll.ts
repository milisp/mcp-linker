import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/stores/useSessionStore";
import { formatDurationMs } from "@/utils/formatDuration";

interface UseChatScrollOptions {
  activeConversationId?: string | null;
  scrollThreshold?: number;
}

export function useChatScroll({
  activeConversationId,
  scrollThreshold = 64,
}: UseChatScrollOptions) {
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const autoScrollRef = useRef(isAutoScrollEnabled);
  const manualOverrideRef = useRef(isManualOverride);
  const [elapsedMs, setElapsedMs] = useState(0);

  const busyState = useSessionStore((state) =>
    activeConversationId ? state.busyByConversationId[activeConversationId] : undefined,
  );
  const isConversationBusy = busyState?.isBusy ?? false;
  const busyStartTime = busyState?.busyStartTime ?? null;
  const elapsedLabel = useMemo(
    () => formatDurationMs(elapsedMs),
    [elapsedMs],
  );

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    manualOverrideRef.current = false;
    autoScrollRef.current = true;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    setIsManualOverride(false);
    setIsAutoScrollEnabled(true);
  }, []);

  const scrollToTop = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    manualOverrideRef.current = true;
    autoScrollRef.current = false;
    viewport.scrollTo({ top: 0, behavior: "smooth" });
    setIsManualOverride(true);
    setIsAutoScrollEnabled(false);
  }, []);

  // Sync refs with state
  useEffect(() => {
    autoScrollRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    manualOverrideRef.current = isManualOverride;
  }, [isManualOverride]);

  // Setup viewport reference and scroll listener
  useEffect(() => {
    const content = scrollContentRef.current;
    if (!content) return;

    const viewport = content.closest(
      "[data-slot='scroll-area-viewport']",
    ) as HTMLElement | null;
    if (!viewport) return;

    viewportRef.current = viewport;

    const handleScroll = () => {
      const distanceToBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const shouldStick = distanceToBottom <= scrollThreshold;

      if (shouldStick) {
        if (manualOverrideRef.current && viewport.scrollTop === 0) return;

        if (manualOverrideRef.current && viewport.scrollTop > 0) {
          manualOverrideRef.current = false;
          setIsManualOverride(false);
        }
        if (!autoScrollRef.current) {
          autoScrollRef.current = true;
          setIsAutoScrollEnabled(true);
        }
      } else {
        if (autoScrollRef.current) {
          autoScrollRef.current = false;
          setIsAutoScrollEnabled(false);
        }
        if (!manualOverrideRef.current) {
          manualOverrideRef.current = true;
          setIsManualOverride(true);
        }
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      if (viewportRef.current === viewport) {
        viewportRef.current = null;
      }
    };
  }, [activeConversationId, scrollThreshold]);

  useEffect(() => {
    if (!isConversationBusy || busyStartTime === null) {
      setElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => setElapsedMs(Date.now() - busyStartTime);
    updateElapsed();

    const intervalId =
      typeof window !== "undefined"
        ? window.setInterval(updateElapsed, 1000)
        : undefined;

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [busyStartTime, isConversationBusy]);

  // Reset scroll state on conversation change
  useEffect(() => {
    autoScrollRef.current = true;
    manualOverrideRef.current = false;
    setIsAutoScrollEnabled(true);
    setIsManualOverride(false);
  }, [activeConversationId]);

  // Auto-scroll when content updates
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isAutoScrollEnabled) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [isAutoScrollEnabled]);

  return {
    scrollContentRef,
    viewportRef,
    isAutoScrollEnabled,
    isManualOverride,
    scrollToBottom,
    scrollToTop,
    elapsedLabel,
  };
}
