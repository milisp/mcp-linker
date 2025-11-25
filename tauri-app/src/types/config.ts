export interface ModelProvider {
  name: string;
  base_url: string;
  env_key?: string;
}

export interface Profile {
  model_provider: string;
  model?: string;
}

export interface ProviderConfig {
  provider: ModelProvider;
  profile?: Profile;
}
