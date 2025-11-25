import { TokenUsage } from "@/bindings/TokenUsage";
import { invoke } from "@tauri-apps/api/core";

export interface NewSessionData {
  rolloutPath: string;
  projectPath: string;
  sessionId: string;
  usage: TokenUsage;
  timestamp: string;
}

export interface SessionMetrics {
  sessionId: string;
  timestamp: Date;
  projectPath: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  cached_input_tokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface UsageSummary {
  totalCost: number;
  totalSessions: number;
  totalTokens: number;
  avgCostPerSession: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  cached_input_tokens: number;
  modelBreakdown: Record<
    string,
    { sessions: number; cost: number; tokens: number }
  >;
  projectBreakdown: Record<
    string,
    { sessions: number; cost: number; tokens: number }
  >;
  timelineData: Array<{
    date: string;
    cost: number;
    tokens: number;
    sessions: number;
  }>;
}

// Cost per million tokens (estimated based on common model pricing)
const MODEL_COSTS: Record<
  string,
  { input: number; output: number; cache_write: number; cache_read: number }
> = {
  "gpt-5-codex": {
    input: 2.5,
    output: 10,
    cache_write: 1.25,
    cache_read: 0.125,
  },
  "gpt-5": { input: 2.5, output: 10, cache_write: 1.25, cache_read: 0.125 },
};

function calculateTokenCost(usage: TokenUsage, model: string): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-5"]; // Default to Sonnet

  const nonCachedInput = usage.input_tokens - (usage.cached_input_tokens || 0);
  const inputCost = (nonCachedInput / 1_000_000) * costs.input;
  const outputCost = (usage.output_tokens / 1_000_000) * costs.output;
  const cacheWriteCost =
    ((usage.cached_input_tokens || 0) / 1_000_000) * costs.cache_write;
  const cacheReadCost = 0; // Cache reads are typically much cheaper

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

export async function calculateUsageSummary(): Promise<UsageSummary> {
  const newSessionDataArray = await invoke<NewSessionData[]>("read_token_usage");
  const sessionMetrics: SessionMetrics[] = [];

  // Process all session data
  for (const data of newSessionDataArray) {
    const model = "gpt-5"; // Default model, as NewSessionData doesn't contain it directly
    const estimatedCost = calculateTokenCost(data.usage, model);

    if (data.usage.total_tokens > 0) {
      sessionMetrics.push({
        sessionId: data.sessionId,
        timestamp: new Date(data.timestamp),
        projectPath: data.projectPath,
        model,
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        reasoning_output_tokens: data.usage.reasoning_output_tokens, // Assuming same as output_tokens for now
        cached_input_tokens: data.usage.cached_input_tokens,
        totalTokens: data.usage.total_tokens,
        estimatedCost,
      });
    }
  }

  // Calculate summary statistics
  const totalCost = sessionMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
  const totalSessions = sessionMetrics.length;
  const totalTokens = sessionMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
  const avgCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0;

  const input_tokens = sessionMetrics.reduce(
    (sum, m) => sum + m.input_tokens,
    0,
  );
  const output_tokens = sessionMetrics.reduce(
    (sum, m) => sum + m.output_tokens,
    0,
  );
  const reasoning_output_tokens = sessionMetrics.reduce(
    (sum, m) => sum + m.reasoning_output_tokens,
    0,
  );
  const cached_input_tokens = sessionMetrics.reduce(
    (sum, m) => sum + m.cached_input_tokens,
    0,
  );

  // Model breakdown
  const modelBreakdown: Record<
    string,
    { sessions: number; cost: number; tokens: number }
  > = {};
  for (const metric of sessionMetrics) {
    if (!modelBreakdown[metric.model]) {
      modelBreakdown[metric.model] = { sessions: 0, cost: 0, tokens: 0 };
    }
    modelBreakdown[metric.model].sessions++;
    modelBreakdown[metric.model].cost += metric.estimatedCost;
    modelBreakdown[metric.model].tokens += metric.totalTokens;
  }

  // Project breakdown
  const projectBreakdown: Record<
    string,
    { sessions: number; cost: number; tokens: number }
  > = {};
  for (const metric of sessionMetrics) {
    if (!projectBreakdown[metric.projectPath]) {
      projectBreakdown[metric.projectPath] = {
        sessions: 0,
        cost: 0,
        tokens: 0,
      };
    }
    projectBreakdown[metric.projectPath].sessions++;
    projectBreakdown[metric.projectPath].cost += metric.estimatedCost;
    projectBreakdown[metric.projectPath].tokens += metric.totalTokens;
  }

  // Timeline data (group by date)
  const timelineMap: Record<
    string,
    { cost: number; tokens: number; sessions: number }
  > = {};
  for (const metric of sessionMetrics) {
    const date = metric.timestamp.toISOString().split("T")[0];
    if (!timelineMap[date]) {
      timelineMap[date] = { cost: 0, tokens: 0, sessions: 0 };
    }
    timelineMap[date].cost += metric.estimatedCost;
    timelineMap[date].tokens += metric.totalTokens;
    timelineMap[date].sessions++;
  }

  const timelineData = Object.entries(timelineMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCost,
    totalSessions,
    totalTokens,
    avgCostPerSession,
    input_tokens,
    output_tokens,
    reasoning_output_tokens,
    cached_input_tokens,
    modelBreakdown,
    projectBreakdown,
    timelineData,
  };
}
