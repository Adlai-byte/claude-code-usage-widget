import { describe, it, expect } from 'vitest';
import { aggregateUsage } from '../aggregator';
import { SessionRecord, SessionInfo } from '../../types';

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
    const day = result.dailyUsage.find(d => d.date === '2026-03-01');
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
    const cell = result.heatmap.find(h => h.hour === 10);
    expect(cell).toBeDefined();
    expect(cell!.count).toBeGreaterThan(0);
  });

  it('returns zero totals for empty input', () => {
    const result = aggregateUsage([], []);
    expect(result.totalTokens).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalSessions).toBe(0);
  });
});
