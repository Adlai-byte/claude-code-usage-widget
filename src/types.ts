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

export interface PlanUsageTier {
  utilization: number;   // 0-100 percentage
  resetsAt: string | null; // ISO 8601 timestamp
}

export interface PlanUsage {
  fiveHour: PlanUsageTier | null;
  sevenDay: PlanUsageTier | null;
  sevenDayOpus: PlanUsageTier | null;
  sevenDaySonnet: PlanUsageTier | null;
  subscriptionType: string;      // "max", "pro", etc.
  rateLimitTier: string;         // "default_claude_max_5x", etc.
}

export interface AccountInfo {
  name: string;
  email: string;
  plan: string;
  orgName: string;
}

export interface UsageData {
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  todayTokens: number;
  todayCost: number;
  todaySessions: number;
  weekTokens: number;
  weekCost: number;
  weekSessions: number;
  currentSessionId: string;
  currentSessionTokens: number;
  currentSessionCost: number;
  dailyUsage: DailyUsage[];
  projectUsage: ProjectUsage[];
  heatmap: HeatmapCell[];
  modelUsage: ModelUsage[];
  lastUpdated: number;
  planUsage: PlanUsage | null;
  tokenStatus: 'ok' | 'expired' | 'missing';
  accountInfo: AccountInfo | null;
}

export type ThemeMode = 'system' | 'dark' | 'light';
export type AccentColor = 'indigo' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface AppSettings {
  refreshInterval: number;
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBudget: number;
  alertThreshold: number;
  theme: ThemeMode;
  accentColor: AccentColor;
  windowOpacity: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 60000,
  dailyBudget: 0,
  weeklyBudget: 0,
  monthlyBudget: 0,
  alertThreshold: 0.75,
  theme: 'dark',
  accentColor: 'indigo',
  windowOpacity: 100,
};

export const ACCENT_COLORS: Record<AccentColor, { main: string; light: string }> = {
  indigo: { main: '#6366f1', light: '#818cf8' },
  blue: { main: '#3b82f6', light: '#60a5fa' },
  green: { main: '#10b981', light: '#34d399' },
  purple: { main: '#8b5cf6', light: '#a78bfa' },
  orange: { main: '#f59e0b', light: '#fbbf24' },
  red: { main: '#ef4444', light: '#f87171' },
};

export const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-opus-4-20250514': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-sonnet-4-6': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-sonnet-4-20250514': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-3-5-haiku-20241022': { input: 0.8 / 1e6, output: 4 / 1e6, cacheWrite: 1.0 / 1e6, cacheRead: 0.08 / 1e6 },
};

export const DEFAULT_PRICING = { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 };
