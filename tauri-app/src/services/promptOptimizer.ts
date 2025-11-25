export interface PromptOptimizationPayload {
  prompt: string;
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export async function optimizePromptRequest(payload: PromptOptimizationPayload): Promise<string> {
  const {
    prompt,
    model,
    provider,
    apiKey,
    baseUrl,
  } = payload;

  const DEFAULT_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/openai',
    openrouter: 'https://openrouter.ai/api/v1',
    ollama: 'http://localhost:11434/v1',
    xai: 'https://api.x.ai/v1',
  };

  const resolveBaseUrl = (url?: string) => {
    const fallback = DEFAULT_BASE_URLS[provider] || DEFAULT_BASE_URLS.openai;
    const normalized = (url || fallback).replace(/\/+$/, '');
    return `${normalized}/chat/completions`;
  };

  const endpoint = resolveBaseUrl(baseUrl);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      let errorMessage = `Prompt optimization failed with status ${response.status}`;

      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          errorMessage = errorBody.error.message;
        }
      } catch (jsonError) {
        console.error('Failed to parse optimization error response:', jsonError);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const optimizedContent: unknown = data?.choices?.[0]?.message?.content;

    if (typeof optimizedContent !== 'string') {
      throw new Error('Prompt optimizer did not return text content');
    }

    return optimizedContent.trim();
  } catch (error) {
    console.error('Prompt optimization request failed:', error);
    throw error instanceof Error ? error : new Error('Unknown prompt optimization error');
  }
}
