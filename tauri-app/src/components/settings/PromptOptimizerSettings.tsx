import { useEffect, type ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ProviderStateModelProvider,
  useProviderStore,
  usePromptOptimizerStore,
} from "@/stores";

export function PromptOptimizerSettings() {
  const { provider, model, setProvider, setModel } = usePromptOptimizerStore();
  const { providers, setApiKey, setBaseUrl } = useProviderStore();

  const fallbackProviderId = providers[0]?.id ?? "openai";
  const normalizedProvider = providers.some(
    (item: ProviderStateModelProvider) => item.id === provider,
  )
    ? provider
    : fallbackProviderId;

  useEffect(() => {
    if (provider !== normalizedProvider) {
      setProvider(normalizedProvider);
    }
  }, [normalizedProvider, provider, setProvider]);

  const activeProvider = providers.find(
    (item: ProviderStateModelProvider) => item.id === normalizedProvider,
  );
  const availableModels = activeProvider?.models ?? [];

  const currentApiKey = activeProvider?.apiKey ?? "";
  const currentBaseUrl = activeProvider?.baseUrl ?? "";

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (activeProvider) {
      setApiKey(activeProvider.id, event.target.value);
    }
  };

  const handleBaseUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (activeProvider) {
      setBaseUrl(activeProvider.id, event.target.value);
    }
  };

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProviderId = event.target.value;
    setProvider(nextProviderId);
    const nextProvider = providers.find(
      (item: ProviderStateModelProvider) => item.id === nextProviderId,
    );
    const nextModel = nextProvider?.models[0] ?? "";
    setModel(nextModel);
  };

  useEffect(() => {
    if (!availableModels.includes(model)) {
      setModel(availableModels[0] ?? "");
    }
  }, [availableModels, model, setModel]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Optimization Model</CardTitle>
        <CardDescription>
          Choose the provider and model used exclusively for prompt polishing.
          This setting does not affect chat sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
            API Key {normalizedProvider !== "ollama"}
          </Label>
          <Input
            type="password"
            placeholder="api key"
            value={currentApiKey}
            onChange={handleApiKeyChange}
            className="font-mono text-xs"
            disabled={!activeProvider}
          />
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
              base_url
            </Label>
            <Input
              placeholder="https://api.example.com/v1"
              value={currentBaseUrl}
              onChange={handleBaseUrlChange}
              className="font-mono text-xs"
              disabled={!activeProvider}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="optimizer-provider">Provider</Label>
          <select
            id="optimizer-provider"
            value={provider}
            onChange={handleProviderChange}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {providers.map((item: ProviderStateModelProvider) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="optimizer-model">Model</Label>
          {availableModels.length > 0 ? (
            <select
              id="optimizer-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableModels.map((availableModel: string) => (
                <option key={availableModel} value={availableModel}>
                  {availableModel}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved models for {activeProvider?.name ?? "this provider"}. Add
              one in the Provider
              section first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
