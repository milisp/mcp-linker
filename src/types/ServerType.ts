import type { ServerConfig } from "./index";

export type ServerType = {
  /** Registry server name in reverse-DNS form, e.g. io.github.user/weather */
  id: string;
  name: string;
  developer?: string;
  logoUrl?: string;
  description: string;
  source: string;
  isOfficial: boolean;
  version?: string;
  isFavorited: boolean;
  tags?: string[];
  tools?: string[];
  /** Installable configs derived from the registry packages/remotes */
  configs?: ServerConfig[];
};
