import type { ServerConfig } from "./index";

export type ServerType = {
  /** Registry server name in reverse-DNS form, e.g. io.github.user/weather */
  id: string;
  name: string;
  developer?: string;
  logoUrl?: string;
  description: string;
  source: string;
  websiteUrl?: string;
  repositoryUrl?: string;
  isOfficial: boolean;
  version?: string;
  isFavorited: boolean;
  tags?: string[];
  tools?: string[];
  /** Installable configs derived from the registry packages/remotes */
  configs?: ServerConfig[];
  /** Registry inputs that must be configured before adding this server. */
  requiresConfiguration?: boolean;
  /** Local installed entry, loaded from the selected client rather than Registry. */
  installed?: { name: string; disabled: boolean };
};
