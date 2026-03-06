import { describe, it, expect } from 'vitest';
import { aggregateUsage } from '../aggregator';
import { SessionRecord, SessionInfo } from '../../types';

// Helper: format timestamp as local date string (matches aggregator's formatDate)
function localDate(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const makeRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: 'sess-1',
  timestamp: new Date('2026-03-01T10:00:00Z').getTime(),
  model: 'claude-opus-4-6',
  usage: { inputTokens: 100, outputTokens: 50, cacheCreationTokens: 0, cacheReadTokens: 0 },
  ...overrides,
});

const makeInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  sessionId: 'sess-1',
  project: 'D:\\MyProject',
  timestamp: new Date('2026-03-01T10:00:00Z').getTime(),
  ...overrides,
});

describe('aggregateUsage', () => {
  it('computes daily totals', () => {
    const records = [
      makeRecord(),
      makeRecord({ usage: { inputTokens: 200, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 } }),
    ];
    const infos = [makeInfo()];

    const result = aggregateUsage(records, infos);
    const expectedDate = localDate(records[0].timestamp);
    const day = result.dailyUsage.find(d => d.date === expectedDate);
    expect(day).toBeDefined();
    expect(day!.inputTokens).toBe(300);
    expect(day!.outputTokens).toBe(150);
  });

  it('computes project totals', () => {
    const records = [makeRecord()];
    const infos = [makeInfo()];

    const result = aggregateUsage(records, infos);
    expect(result.projectUsage.length).toBeGreaterThan(0);
    expect(result.projectUsage[0].displayName).toBe('MyProject');
  });

  it('computes model breakdown', () => {
    const records = [
      makeRecord({ model: 'claude-opus-4-6' }),
      makeRecord({ model: 'claude-sonnet-4-6', usage: { inputTokens: 50, outputTokens: 25, cacheCreationTokens: 0, cacheReadTokens: 0 } }),
    ];
    const result = aggregateUsage(records, [makeInfo()]);
    expect(result.modelUsage.length).toBe(2);
  });

  it('builds activity heatmap', () => {
    const records = [makeRecord()];
    const result = aggregateUsage(records, [makeInfo()]);
    // Use local hour for comparison (aggregator now uses local time)
    const expectedHour = new Date(records[0].timestamp).getHours();
    const cell = result.heatmap.find(h => h.hour === expectedHour);
    expect(cell).toBeDefined();
    expect(cell!.count).toBeGreaterThan(0);
  });

  it('returns zero totals for empty input', () => {
    const result = aggregateUsage([], []);
    expect(result.totalTokens).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalSessions).toBe(0);
    expect(result.weekTokens).toBe(0);
    expect(result.currentSessionId).toBe('');
    expect(result.currentSessionTokens).toBe(0);
    expect(result.planUsage).toBeNull();
  });

  it('tracks current session as most recent by timestamp', () => {
    const records = [
      makeRecord({ sessionId: 'old-sess', timestamp: new Date('2026-02-28T10:00:00Z').getTime() }),
      makeRecord({ sessionId: 'new-sess', timestamp: new Date('2026-03-01T12:00:00Z').getTime() }),
    ];
    const result = aggregateUsage(records, []);
    expect(result.currentSessionId).toBe('new-sess');
    expect(result.currentSessionTokens).toBe(150); // 100 + 50
  });
});
