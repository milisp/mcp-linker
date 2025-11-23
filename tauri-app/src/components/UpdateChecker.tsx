import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";

interface UpdateState {
  update?: Update;
  error?: string;
}

const STORAGE_KEYS = {
  SKIPPED_VERSIONS: 'mcp-linker-skipped-versions',
  LAST_CHECK_TIME: 'mcp-linker-last-update-check',
  REMIND_LATER_TIME: 'mcp-linker-remind-later'
};

const CHECK_INTERVAL_HOURS = 24; // Check for updates every 24 hours
const REMIND_LATER_HOURS = 24; // Remind later interval 24 hours

export function UpdateChecker() {
  const [updateState, setUpdateState] = useState<UpdateState>({});
  const [showDialog, setShowDialog] = useState(false);

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

  const checkForUpdates = async () => {
    if (!shouldCheckForUpdates()) {
      return;
    }

    try {
      const update = await check();
      localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, new Date().toISOString());
      
      if (update && update.version && shouldShowUpdateDialog(update.version)) {
        setUpdateState(prev => ({
          ...prev,
          update,
        }));
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setUpdateState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  const downloadAndInstall = async () => {
    if (!updateState.update) return;

    setShowDialog(false);

    try {
      await updateState.update.downloadAndInstall();
    } catch (error) {
      console.error("Failed to download and install update:", error);
      setUpdateState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Update failed",
      }));
      return;
    }
  };

  // Check for updates on app startup
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <>
      {/* Update available dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Available</DialogTitle>
            <DialogDescription>
              Version {updateState.update?.version} is available. Would you like to download and install it?
            </DialogDescription>
          </DialogHeader>

          {updateState.update?.body && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">What's new:</h4>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-40 overflow-y-auto whitespace-pre-wrap">
                {updateState.update.body}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                if (updateState.update?.version) {
                  skipVersion(updateState.update.version);
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
              <Button
                onClick={async () => {
                  await downloadAndInstall();
                  // Relaunch the app after successful install to apply update
                  await relaunch();
                }}
              >
                Update Now
              </Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No progress UI; app will relaunch after install */}
    </>
  );
}
