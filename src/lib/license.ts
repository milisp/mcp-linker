import { invoke } from "@tauri-apps/api/core";

export const PRICING_URL = "https://mcp-linker.milisp.dev/pricing";

/** What a license unlocks; each tier includes the ones before it. */
export type Tier = "free" | "plus" | "pro";

export interface LicenseStatus {
  licensed: boolean;
  /** "free" when unlicensed or when this version is past the key's updates. */
  tier: Tier;
  displayKey: string | null;
  deviceId: string | null;
  /** RFC 3339; null for lifetime updates. */
  updatesUntil: string | null;
  /** Activated, but this version was released after the key's updates ended. */
  updatesExpired: boolean;
}

export const getLicenseStatus = () => invoke<LicenseStatus>("license_status");

export const activateLicense = (key: string) =>
  invoke<LicenseStatus>("activate_license", { key });

export const deactivateLicense = () =>
  invoke<LicenseStatus>("deactivate_license");
