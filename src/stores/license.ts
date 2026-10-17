import { getClient } from "@/lib/clients";
import { getLicenseStatus, type LicenseStatus, type Tier } from "@/lib/license";
import { create } from "zustand";

/** Paid features. Keep in step with `license::require` calls in src-tauri. */
export type ProFeature = "client" | "batch" | "inspection";

/** The tier each feature needs by default; `client` comes from the client. */
const FEATURE_TIER: Record<Exclude<ProFeature, "client">, Tier> = {
  batch: "plus",
  inspection: "plus",
};

const RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };

interface Upgrade {
  feature: ProFeature;
  /** The tier that unlocks it. */
  tier: Tier;
  /** Label of the client, with `feature: "client"`. */
  client?: string;
}

interface LicenseState {
  status: LicenseStatus | null;
  /** What the upgrade dialog is open for, if anything. */
  upgrade: Upgrade | null;
  load: () => Promise<void>;
  setStatus: (status: LicenseStatus) => void;
  closeUpgrade: () => void;
}

export const useLicense = create<LicenseState>()(set => ({
  status: null,
  upgrade: null,
  load: async () => set({ status: await getLicenseStatus() }),
  setStatus: status => set({ status }),
  closeUpgrade: () => set({ upgrade: null }),
}));

const covers = (have: Tier | undefined, need: Tier) => RANK[have ?? "free"] >= RANK[need];

/** True when this device's license includes `tier`. */
export const useHasTier = (tier: Tier) => useLicense(state => covers(state.status?.tier, tier));

function check(upgrade: Upgrade): boolean {
  if (covers(useLicense.getState().status?.tier, upgrade.tier)) return true;
  useLicense.setState({ upgrade });
  return false;
}

/** True when licensed for `feature`; otherwise opens the upgrade dialog and returns false. */
export function requirePro(feature: Exclude<ProFeature, "client">, tier: Tier = FEATURE_TIER[feature]): boolean {
  return check({ feature, tier });
}

/** Writing to a client's config needs the client's tier (Claude Desktop and Cursor are free). */
export function requireClient(clientId: string): boolean {
  const client = getClient(clientId);
  return check({ feature: "client", tier: client?.tier ?? "pro", client: client?.label ?? clientId });
}
