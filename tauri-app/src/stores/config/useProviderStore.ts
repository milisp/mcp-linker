import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConfigService } from "@/services/configService";
import { ModelProvider } from "@/types/config";
import {
  initialProviders,
  mandatoryProviderIds,
} from "./initialProviders";

export interface ProviderStateModelProvider {
  id: string;
  name: string;
  models: string[];
  apiKey: string;
  envKey?: string;
  baseUrl?: string;
}

type ReasoningEffort = "minimal" | "low" | "medium" | "high";

type ProviderState = {
  providers: ProviderStateModelProvider[];
  selectedProviderId: string | "openai";
  selectedModel: string | null;
  reasoningEffort: ReasoningEffort;
};

type ProviderActions = {
  addProvider: (
    provider: {
      name: string;
      models: string[];
      baseUrl?: string;
      envKey?: string;
    },
    options?: {
      persist?: boolean;
    },
  ) => void;
  setApiKey: (id: string, key: string) => void;
  setEnvKey: (id: string, keyVar: string) => void;
  setBaseUrl: (id: string, baseUrl: string) => void;
  setSelectedProviderId: (id: string) => void;
  setSelectedModel: (model: string) => void;
  addModel: (providerId: string, model: string) => void;
  deleteModel: (providerId: string, model: string) => void;
  deleteProvider: (providerId: string) => void;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  setOllamaModels: (models: string[]) => void;
  setProvidersFromConfig: (configProviders: Record<string, ModelProvider>) => void;
};

export const useProviderStore = create<ProviderState & ProviderActions>()(
  persist(
    (set, get) => ({
      providers: initialProviders,
      selectedProviderId: initialProviders[0].id,
      selectedModel: initialProviders[0].models[0],
      reasoningEffort: "medium",

      setSelectedProviderId: (id: string) => {
        const provider = get().providers.find((p) => p.id === id);
        if (provider) {
          set({
            selectedProviderId: id,
            selectedModel: provider.models[0] ?? null,
          });
        }
      },
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiKey: (id, key) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, apiKey: key } : p,
          ),
        }));
      },
      setEnvKey: (id, keyVar) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, envKey: keyVar } : p,
          ),
        }));
      },
      setBaseUrl: (id, baseUrl) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, baseUrl: baseUrl } : p,
          ),
        }));
      },
      addProvider: (
        providerData: {
          name: string;
          models: string[];
          baseUrl?: string;
          envKey?: string;
        },
        options = { persist: true },
      ) => {
        const newProvider: ProviderStateModelProvider = {
          ...providerData,
          id: providerData.name.toLowerCase().replace(/\s+/g, "-"),
          apiKey: "",
          envKey: providerData.envKey || "",
          baseUrl: providerData.baseUrl || "",
        };
        set((state) => ({
          providers: [...state.providers, newProvider],
        }));

        if (options.persist) {
          // Persist provider config
          const configServiceNewProvider: ModelProvider = {
            name: newProvider.name,
            base_url: newProvider.baseUrl || "",
            env_key: newProvider.envKey || undefined,
          };
          ConfigService.addOrUpdateModelProvider(
            newProvider.id,
            configServiceNewProvider,
          );

          // Persist profile config
          ConfigService.addOrUpdateProfile(newProvider.id, {
            model_provider: newProvider.id,
            model: newProvider.models[0] || undefined,
          });
        }
      },
      addModel: (providerId, model) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId ? { ...p, models: [...p.models, model] } : p,
          ),
        }));
      },
      setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
      setOllamaModels: (models: string[]) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === "ollama" ? { ...p, models: models } : p,
          ),
        }));
      },
      deleteModel: (providerId, modelToDelete) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.filter((m) => m !== modelToDelete) }
              : p,
          ),
        }));
      },
      deleteProvider: (providerId: string) => {
        set((state) => {
          const updatedProviders = state.providers.filter(
            (p) => p.id !== providerId,
          );

          let newSelectedProviderId = state.selectedProviderId;
          let newSelectedModel = state.selectedModel;

          if (state.selectedProviderId === providerId) {
            newSelectedProviderId = updatedProviders[0]?.id;
            newSelectedModel = updatedProviders[0]?.models[0] || null;
          }

          // Delete provider config
          ConfigService.deleteModelProvider(providerId);
          // Delete profile config
          ConfigService.deleteProfile(providerId);

          return {
            providers: updatedProviders,
            selectedProviderId: newSelectedProviderId,
            selectedModel: newSelectedModel,
          };
        });
      },
      setProvidersFromConfig: (configProviders) => {
        set((state) => {
          const providerById = new Map(
            state.providers.map((provider) => [provider.id, provider]),
          );

          const getMandatoryProvider = (
            id: string,
          ): ProviderStateModelProvider | null => {
            const existing = providerById.get(id);
            if (existing) {
              return { ...existing, models: [...existing.models] };
            }
            const template = initialProviders.find((provider) => provider.id === id);
            if (template) {
              return { ...template, models: [...template.models] };
            }
            return null;
          };

          const mandatoryProviders = mandatoryProviderIds
            .map(getMandatoryProvider)
            .filter(
              (
                provider,
              ): provider is ProviderStateModelProvider => provider !== null,
            );

          const customProviders = Object.entries(configProviders)
            .filter(([id]) => !mandatoryProviderIds.includes(id))
            .map(([id, provider]) => {
              const existing = providerById.get(id);
              return {
                id,
                name: provider.name,
                models: existing?.models ? [...existing.models] : [],
                apiKey: existing?.apiKey ?? "",
                envKey: provider.env_key ?? existing?.envKey ?? "",
                baseUrl: provider.base_url ?? existing?.baseUrl ?? "",
              };
            });

          const mergedProviders = [...mandatoryProviders, ...customProviders];

          let newSelectedProviderId = state.selectedProviderId;
          if (
            !mergedProviders.some(
              (provider) => provider.id === newSelectedProviderId,
            )
          ) {
            newSelectedProviderId = "openai";
          }

          const activeProvider = mergedProviders.find(
            (provider) => provider.id === newSelectedProviderId,
          );

          const newSelectedModel =
            activeProvider?.models.find((model) => model === state.selectedModel) ??
            activeProvider?.models[0] ??
            null;

          return {
            providers: mergedProviders,
            selectedProviderId: newSelectedProviderId,
            selectedModel: newSelectedModel,
          };
        });
      },
    }),
    {
      name: "provider",
    },
  ),
);
