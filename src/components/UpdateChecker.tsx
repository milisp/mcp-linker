import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useLicense } from "@/stores/license";
import { useUpdateStore } from "@/stores/useUpdateStore";
import { listen } from "@tauri-apps/api/event";
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from "@tauri-apps/plugin-updater";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

const STORAGE_KEYS = {
  SKIPPED_VERSIONS: 'mcp-linker-skipped-versions',
  LAST_CHECK_TIME: 'mcp-linker-last-update-check',
  REMIND_LATER_TIME: 'mcp-linker-remind-later'
};

const CHECK_INTERVAL_HOURS = 24; // Check for updates every 24 hours
const REMIND_LATER_HOURS = 24; // Remind later interval 24 hours

// Emitted by the native "Check for Updates…" menu item (src-tauri/src/menu.rs)
const MENU_CHECK_EVENT = "menu://check-for-updates";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Release notes come from the CHANGELOG.md section; render only the subset it uses
// (### headings, "- " bullets, **bold**) instead of pulling in a markdown library
const renderInline = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium text-foreground">{part}</strong> : part
  );

function ReleaseNotes({ body }: { body: string }) {
  return (
    <div className="space-y-1">
      {body.split("\n").map((raw, i) => {
        const line = raw.trim();
        if (!line) return null;
        if (line.startsWith("#")) {
          return (
            <h5 key={i} className="pt-2 first:pt-0 font-medium text-foreground">
              {line.replace(/^#+\s*/, "")}
            </h5>
          );
        }
        if (/^[-*]\s+/.test(line)) {
          return (
            <div key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{renderInline(line.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// The updater reports dates like "2026-10-13 12:00:00.0 +00:00:00"; keep the day.
const releaseDay = (date: string | undefined) => {
  const time = date ? Date.parse(date.slice(0, 10)) : NaN;
  return Number.isNaN(time) ? null : time;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function UpdateChecker() {
  const updatesUntil = useLicense(state => state.status?.updatesUntil);
  const {
    status,
    update,
    error,
    showDialog,
    downloaded,
    total,
    setStatus,
    setShowDialog,
    setUpdate,
    setError,
    setProgress,
    manualCheckTrigger,
    triggerManualCheck,
  } = useUpdateStore();

  const isBusy = status === "downloading" || status === "installing";

  // Get list of skipped versions
  const getSkippedVersions = (): string[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.SKIPPED_VERSIONS);
    return stored ? JSON.parse(stored) : [];
  };

  // Add version to skip list
  const skipVersion = (version: string) => {
    const skippedVersions = getSkippedVersions();
    if (!skippedVersions.includes(version)) {
      skippedVersions.push(version);
      localStorage.setItem(STORAGE_KEYS.SKIPPED_VERSIONS, JSON.stringify(skippedVersions));
    }
  };

  // Check if update dialog should be shown
  const shouldShowUpdateDialog = (version: string): boolean => {
    if (import.meta.env.DEV) return true;
    // Check if version is in skip list
    const skippedVersions = getSkippedVersions();
    if (skippedVersions.includes(version)) {
      return false;
    }

    // Check remind later time
    const remindLaterTime = localStorage.getItem(STORAGE_KEYS.REMIND_LATER_TIME);
    if (remindLaterTime) {
      const remindTime = new Date(remindLaterTime);
      const now = new Date();
      if (now < remindTime) {
        return false;
      }
    }

    return true;
  };

  // Check update frequency control
  const shouldCheckForUpdates = (): boolean => {
    if (import.meta.env.DEV) return false;
    const lastCheckTime = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
    if (!lastCheckTime) return true;

    const lastCheck = new Date(lastCheckTime);
    const now = new Date();
    const timeDiff = now.getTime() - lastCheck.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= CHECK_INTERVAL_HOURS;
  };

  const checkForUpdates = async (isManual: boolean = false) => {
    const current = useUpdateStore.getState().status;
    // A download is already running or a check is in flight: just surface the dialog
    if (current === "downloading" || current === "installing" || current === "checking") {
      if (isManual) setShowDialog(true);
      return;
    }
    if (!isManual && !shouldCheckForUpdates()) {
      return;
    }

    setStatus("checking");
    setError(null);
    // Manual checks open the dialog right away so the user sees the spinner
    if (isManual) setShowDialog(true);

    try {
      const result = await check();
      localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, new Date().toISOString());

      if (result) {
        setUpdate(result);
        setStatus("available");
        if (isManual || shouldShowUpdateDialog(result.version)) {
          setShowDialog(true);
        }
      } else {
        setUpdate(null);
        setStatus("up-to-date");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setUpdate(null);
      setError(errorMessage(err));
      // Background checks fail silently
      setStatus(isManual ? "error" : "idle");
    }
  };

  const downloadAndInstall = async () => {
    if (!update) return;
    setStatus("downloading");
    setError(null);
    setProgress(0, null);

    let downloadedBytes = 0;
    let contentLength: number | null = null;
    try {
      await update.download((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? null;
            setProgress(0, contentLength);
            break;
          case "Progress":
            downloadedBytes += event.data.chunkLength;
            setProgress(downloadedBytes, contentLength);
            break;
          case "Finished":
            break;
        }
      });
      setStatus("installing");
      await update.install();
      await relaunch();
    } catch (err) {
      console.error("Failed to download and install update:", err);
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  // Check for updates on app startup
  useEffect(() => {
    checkForUpdates(false);
  }, []);

  // Listen for manual check triggers
  useEffect(() => {
    if (manualCheckTrigger > 0) {
      checkForUpdates(true);
    }
  }, [manualCheckTrigger]);

  // Native app menu: "Check for Updates…"
  useEffect(() => {
    const unlisten = listen(MENU_CHECK_EVENT, () => triggerManualCheck());
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [triggerManualCheck]);

  const percent = total ? Math.min(100, Math.round((downloaded / total) * 100)) : null;

  const renderBody = () => {
    switch (status) {
      case "checking":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Checking for Updates…</DialogTitle>
              <DialogDescription>Contacting the update server.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        );

      case "up-to-date":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                You're up to date
              </DialogTitle>
              <DialogDescription>
                MCP Linker is running the latest version.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowDialog(false)}>OK</Button>
            </DialogFooter>
          </>
        );

      case "error":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="size-5 text-destructive" />
                Update Failed
              </DialogTitle>
              <DialogDescription className="break-words">
                {error ?? "An unknown error occurred."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Close
              </Button>
              <Button onClick={() => (update ? downloadAndInstall() : checkForUpdates(true))}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        );

      case "downloading":
      case "installing":
        return (
          <>
            <DialogHeader>
              <DialogTitle>
                {status === "installing" ? "Installing Update…" : `Downloading ${update?.version ?? "Update"}…`}
              </DialogTitle>
              <DialogDescription>
                {status === "installing"
                  ? "The app will restart automatically when done."
                  : total
                    ? `${formatBytes(downloaded)} of ${formatBytes(total)}`
                    : formatBytes(downloaded)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {status === "installing" || percent === null ? (
                // Indeterminate: no Content-Length, or install step has no progress events
                <div className="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full">
                  <div className="bg-primary absolute inset-y-0 w-1/3 animate-pulse rounded-full" />
                </div>
              ) : (
                <>
                  <Progress value={percent} />
                  <p className="text-right text-xs text-muted-foreground tabular-nums">{percent}%</p>
                </>
              )}
            </div>
          </>
        );

      default:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Update Available</DialogTitle>
              <DialogDescription>
                Version {update?.version} is available. Would you like to download and install it?
              </DialogDescription>
            </DialogHeader>

            {(() => {
              // Personal keys cover a year of updates; a newer version runs as the free version.
              const released = releaseDay(update?.date);
              const until = updatesUntil ? Date.parse(updatesUntil) : NaN;
              if (released === null || Number.isNaN(until) || released <= until) return null;
              return (
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  Your license includes updates until {new Date(until).toLocaleDateString()}. This version
                  runs as the free version unless you renew. You can skip it and keep your current version.
                </p>
              );
            })()}

            {update?.body && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">What's new:</h4>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
                  <ReleaseNotes body={update.body} />
                </div>
              </div>
            )}

            <DialogFooter className="flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (update?.version) {
                    skipVersion(update.version);
                  }
                  setShowDialog(false);
                }}
              >
                Skip this version
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Set reminder for 24 hours later
                    const remindTime = new Date();
                    remindTime.setHours(remindTime.getHours() + REMIND_LATER_HOURS);
                    localStorage.setItem(STORAGE_KEYS.REMIND_LATER_TIME, remindTime.toISOString());
                    setShowDialog(false);
                  }}
                >
                  Remind me later
                </Button>
                <Button onClick={downloadAndInstall}>Update Now</Button>
              </div>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog
      open={showDialog}
      onOpenChange={(open) => {
        // Keep the dialog up while the update is being applied
        if (!open && isBusy) return;
        setShowDialog(open);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => isBusy && e.preventDefault()}
        onEscapeKeyDown={(e) => isBusy && e.preventDefault()}
      >
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}
