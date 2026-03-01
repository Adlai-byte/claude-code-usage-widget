export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  model: string;
  usage: TokenUsage;
}

export interface SessionInfo {
  sessionId: string;
  project: string;
  timestamp: number;
}

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  sessions: number;
}

export interface ProjectUsage {
  project: string;
  displayName: string;
  totalTokens: number;
  estimatedCost: number;
  sessions: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

export interface ModelUsage {
  model: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface UsageData {
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  todayTokens: number;
  todayCost: number;
  todaySessions: number;
  dailyUsage: DailyUsage[];
  projectUsage: ProjectUsage[];
  heatmap: HeatmapCell[];
  modelUsage: ModelUsage[];
  lastUpdated: number;
}

export interface AppSettings {
  refreshInterval: number;
  dailyBudget: number;
  monthlyBudget: number;
  alertThreshold: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 60000,
  dailyBudget: 0,
  monthlyBudget: 0,
  alertThreshold: 0.75,
};

export const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-opus-4-20250514': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-sonnet-4-6': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-sonnet-4-20250514': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-3-5-haiku-20241022': { input: 0.8 / 1e6, output: 4 / 1e6, cacheWrite: 1.0 / 1e6, cacheRead: 0.08 / 1e6 },
};

export const DEFAULT_PRICING = { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 };
