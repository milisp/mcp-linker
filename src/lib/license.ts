import { invoke } from "@tauri-apps/api/core";

export const PRICING_URL = "https://mcp-linker.milisp.dev/pricing";

export interface LicenseStatus {
  licensed: boolean;
  displayKey: string | null;
  deviceId: string | null;
}

export const getLicenseStatus = () => invoke<LicenseStatus>("license_status");

export const activateLicense = (key: string) =>
  invoke<LicenseStatus>("activate_license", { key });

export const deactivateLicense = () =>
  invoke<LicenseStatus>("deactivate_license");
