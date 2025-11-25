import { ProviderStateModelProvider } from "./useProviderStore";

const baseProviders: ProviderStateModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-5.1-codex-mini", "gpt-5.1-codex-max", "gpt-5.1-codex", "gpt-5.1"],
    apiKey: "",
    envKey: "",
    baseUrl: "",
  },
  {
    id: "codexia",
    name: "Codexia",
    models: ["gpt-5.1-codex-mini", "gpt-5.1-codex-max", "gpt-5.1-codex", "gpt-5.1"],
    apiKey: "",
    envKey: "CODEXIA_API_KEY",
    baseUrl: "",
  },
  {
    id: "ollama",
    name: "Ollama",
    models: [],
    apiKey: "",
    envKey: "",
    baseUrl: "http://localhost:11434/v1",
  },
  {
    id: "google",
    name: "Google",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    apiKey: "",
    envKey: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: ["openai/gpt-oss-20b:free", "qwen/qwen3-coder:free"],
    apiKey: "",
    envKey: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "hf",
    name: "Huggingface",
    models: ["openai/gpt-oss-20b"],
    apiKey: "",
    envKey: "HF_API_TOKEN",
    baseUrl: "https://router.huggingface.co/v1",
  },
  {
    id: "xai",
    name: "grok",
    models: ["grok-4"],
    apiKey: "",
    envKey: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
  },
];

const cloneProvider = (
  provider: ProviderStateModelProvider,
): ProviderStateModelProvider => ({
  ...provider,
  models: [...provider.models],
});

export const mandatoryProviderIds = ["openai", "codexia"];

export const initialProviders: ProviderStateModelProvider[] = baseProviders
  .filter((provider) => mandatoryProviderIds.includes(provider.id))
  .map(cloneProvider);

export const builtInProviderTemplates: ProviderStateModelProvider[] =
  baseProviders.map(cloneProvider);

export const getProviderTemplateById = (
  id: string,
): ProviderStateModelProvider | null => {
  const template = baseProviders.find((provider) => provider.id === id);
  return template ? cloneProvider(template) : null;
};
