export type ServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, any>;
  disabled?: boolean;
  autoApprove?: string[];
  type?: string;
  url?: string;
  headers?: Record<string, any>;
};

export type ServerType = {
  id?: string;
  name: string;
  developer?: string;
  icon_url?: string;
  description: string;
  category?: string;
  source: string;
  is_official?: boolean;
  is_hot?: boolean;
  is_featured?: boolean;
  hasViewed?: boolean;
  configs: ServerConfig[];
};

export interface Category {
  id: string;
  name: string;
  icon: JSX.Element;
  content: string;
}
