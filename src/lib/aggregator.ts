import { SessionRecord, SessionInfo, UsageData, DailyUsage, ProjectUsage, HeatmapCell, ModelUsage } from '../types';
import { calculateCost } from './parser';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10);
}

function extractDisplayName(project: string): string {
  const parts = project.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || project;
}

function getToday(): string {
  return formatDate(Date.now());
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = now.getTime() - day * 86400000;
  return formatDate(diff);
}

export function aggregateUsage(records: SessionRecord[], infos: SessionInfo[]): UsageData {
  const today = getToday();
  const weekStart = getWeekStart();

  const sessionProjectMap = new Map<string, string>();
  for (const info of infos) {
    if (!sessionProjectMap.has(info.sessionId)) {
      sessionProjectMap.set(info.sessionId, info.project);
    }
  }

  const dailyMap = new Map<string, DailyUsage>();
  const projectMap = new Map<string, ProjectUsage>();
  const modelMap = new Map<string, ModelUsage>();
  const heatmapMap = new Map<string, HeatmapCell>();
  const dailySessions = new Map<string, Set<string>>();
  const allSessions = new Set<string>();

  let totalTokens = 0;
  let totalCost = 0;
  let todayTokens = 0;
  let todayCost = 0;
  let weekTokens = 0;
  let weekCost = 0;
  const todaySessions = new Set<string>();
  const weekSessions = new Set<string>();

  // Track per-session usage to find the current (most recent) session
  const sessionTokens = new Map<string, number>();
  const sessionCosts = new Map<string, number>();
  let latestSessionId = '';
  let latestTimestamp = 0;

  for (const rec of records) {
    const date = formatDate(rec.timestamp);
    const tokens = rec.usage.inputTokens + rec.usage.outputTokens + rec.usage.cacheCreationTokens + rec.usage.cacheReadTokens;
    const cost = calculateCost(rec.model, rec.usage);

    totalTokens += tokens;
    totalCost += cost;
    allSessions.add(rec.sessionId);

    // Track most recent session
    if (rec.timestamp > latestTimestamp) {
      latestTimestamp = rec.timestamp;
      latestSessionId = rec.sessionId;
    }

    // Per-session accumulation
    sessionTokens.set(rec.sessionId, (sessionTokens.get(rec.sessionId) ?? 0) + tokens);
    sessionCosts.set(rec.sessionId, (sessionCosts.get(rec.sessionId) ?? 0) + cost);

    if (date === today) {
      todayTokens += tokens;
      todayCost += cost;
      todaySessions.add(rec.sessionId);
    }

    if (date >= weekStart) {
      weekTokens += tokens;
      weekCost += cost;
      weekSessions.add(rec.sessionId);
    }

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, estimatedCost: 0, sessions: 0 });
    }
    const daily = dailyMap.get(date)!;
    daily.inputTokens += rec.usage.inputTokens;
    daily.outputTokens += rec.usage.outputTokens;
    daily.cacheCreationTokens += rec.usage.cacheCreationTokens;
    daily.cacheReadTokens += rec.usage.cacheReadTokens;
    daily.estimatedCost += cost;

    if (!dailySessions.has(date)) dailySessions.set(date, new Set());
    dailySessions.get(date)!.add(rec.sessionId);

    const project = sessionProjectMap.get(rec.sessionId) ?? 'Unknown';
    if (!projectMap.has(project)) {
      projectMap.set(project, { project, displayName: extractDisplayName(project), totalTokens: 0, estimatedCost: 0, sessions: 0 });
    }
    const proj = projectMap.get(project)!;
    proj.totalTokens += tokens;
    proj.estimatedCost += cost;

    const modelKey = rec.model;
    if (!modelMap.has(modelKey)) {
      const displayName = modelKey.includes('opus') ? 'Opus' : modelKey.includes('sonnet') ? 'Sonnet' : modelKey.includes('haiku') ? 'Haiku' : modelKey;
      modelMap.set(modelKey, { model: modelKey, displayName, inputTokens: 0, outputTokens: 0, estimatedCost: 0 });
    }
    const modelEntry = modelMap.get(modelKey)!;
    modelEntry.inputTokens += rec.usage.inputTokens;
    modelEntry.outputTokens += rec.usage.outputTokens;
    modelEntry.estimatedCost += cost;

    const d = new Date(rec.timestamp);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;
    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, { day, hour, count: 0 });
    }
    heatmapMap.get(key)!.count++;
  }

  for (const [date, sessions] of dailySessions) {
    const daily = dailyMap.get(date);
    if (daily) daily.sessions = sessions.size;
  }

  const projectSessionSets = new Map<string, Set<string>>();
  for (const rec of records) {
    const project = sessionProjectMap.get(rec.sessionId) ?? 'Unknown';
    if (!projectSessionSets.has(project)) projectSessionSets.set(project, new Set());
    projectSessionSets.get(project)!.add(rec.sessionId);
  }
  for (const [project, sessions] of projectSessionSets) {
    const proj = projectMap.get(project);
    if (proj) proj.sessions = sessions.size;
  }

  const dailyUsage = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const projectUsage = Array.from(projectMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  const heatmap = Array.from(heatmapMap.values());
  const modelUsage = Array.from(modelMap.values()).sort((a, b) => b.estimatedCost - a.estimatedCost);

  return {
    totalTokens,
    totalCost,
    totalSessions: allSessions.size,
    todayTokens,
    todayCost,
    todaySessions: todaySessions.size,
    weekTokens,
    weekCost,
    weekSessions: weekSessions.size,
    currentSessionId: latestSessionId,
    currentSessionTokens: sessionTokens.get(latestSessionId) ?? 0,
    currentSessionCost: sessionCosts.get(latestSessionId) ?? 0,
    dailyUsage,
    projectUsage,
    heatmap,
    modelUsage,
    lastUpdated: Date.now(),
    planUsage: null,
    tokenStatus: 'ok' as const,
  };
}
