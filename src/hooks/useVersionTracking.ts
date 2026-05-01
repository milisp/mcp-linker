// hooks/useVersionTracking.ts
// If app version > 2.1.0, record user in upgraded_users table.
// Uses Supabase client directly (not apiClient) — avoids the chicken-and-egg
// problem where the old API URL is exactly what's broken.
import { useAuth } from "@/hooks/useAuth";
import supabase, { isSupabaseEnabled } from "@/utils/supabase";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useRef } from "react";

const MIN_VERSION = "2.1.0";

function isVersionGt(version: string, min: string): boolean {
  const v = version.split(".").map(Number);
  const m = min.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((v[i] ?? 0) > (m[i] ?? 0)) return true;
    if ((v[i] ?? 0) < (m[i] ?? 0)) return false;
  }
  return false; // equal does not count as upgraded
}

async function recordUpgradedUser(userId: string) {
  if (!isSupabaseEnabled || !supabase) return;

  try {
    const appVersion = await getVersion();
    if (!isVersionGt(appVersion, MIN_VERSION)) return;

    const { error } = await supabase.from("upgraded_users").upsert(
      { user_id: userId, app_version: appVersion },
      { onConflict: "user_id" },
    );

    if (error) console.warn("[VersionTracking] upsert failed:", error.message);
  } catch (err) {
    console.warn("[VersionTracking] error:", err);
  }
}

export function useVersionTracking() {
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user?.id || ranRef.current) return;
    ranRef.current = true;
    recordUpgradedUser(user.id);
  }, [user?.id]);
}
