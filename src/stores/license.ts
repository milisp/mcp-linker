import { getLicenseStatus, type LicenseStatus } from "@/lib/license";
import { create } from "zustand";

/** Paid features. Keep in step with `license::require` calls in src-tauri. */
export type ProFeature = "claudeScope" | "claudeCopy" | "sync" | "batch" | "inspection";

interface LicenseState {
  status: LicenseStatus | null;
  /** Feature the upgrade dialog is open for, if any. */
  upgradeFor: ProFeature | null;
  load: () => Promise<void>;
  setStatus: (status: LicenseStatus) => void;
  closeUpgrade: () => void;
}

export const useLicense = create<LicenseState>()(set => ({
  status: null,
  upgradeFor: null,
  load: async () => set({ status: await getLicenseStatus() }),
  setStatus: status => set({ status }),
  closeUpgrade: () => set({ upgradeFor: null }),
}));

export const useLicensed = () => useLicense(state => state.status?.licensed === true);

/** True when licensed; otherwise opens the upgrade dialog and returns false. */
export function requirePro(feature: ProFeature): boolean {
  if (useLicense.getState().status?.licensed) return true;
  useLicense.setState({ upgradeFor: feature });
  return false;
}

