import { getNewConversationParams } from "@/components/config/ConversationParams";
import { useProviderStore, useSandboxStore } from "@/stores";
import { useCodexStore } from "@/stores/codex/useCodexStore";
import { useMemo } from "react";

export function useBuildNewConversationParams() {
  const { providers, selectedProviderId, selectedModel, reasoningEffort } =
    useProviderStore();
  const { mode, approvalPolicy } = useSandboxStore();
  const { cwd, webSearchEnabled } = useCodexStore();

  const buildNewConversationParams = useMemo(() => {
    const provider = providers.find((item) => item.id === selectedProviderId);

    return getNewConversationParams(
      provider,
      selectedModel ?? "llama3.2",
      cwd,
      approvalPolicy,
      mode,
      {
        model_reasoning_effort: reasoningEffort,
        "web_search_request": webSearchEnabled,
      },
    );
  }, [
    approvalPolicy,
    cwd,
    mode,
    providers,
    reasoningEffort,
    selectedModel,
    selectedProviderId,
    webSearchEnabled,
  ]);

  return buildNewConversationParams;
}
