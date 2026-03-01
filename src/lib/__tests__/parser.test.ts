import { describe, it, expect } from 'vitest';
import { parseSessionLine, parseHistoryLine, calculateCost } from '../parser';

describe('parseSessionLine', () => {
  it('extracts usage from an assistant record (real format: usage inside message)', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'abc-123',
      timestamp: '2026-03-01T10:00:00.000Z',
      message: {
        model: 'claude-opus-4-6',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 300,
        },
      },
    });

    const result = parseSessionLine(line);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('abc-123');
    expect(result!.model).toBe('claude-opus-4-6');
    expect(result!.usage.inputTokens).toBe(100);
    expect(result!.usage.outputTokens).toBe(50);
    expect(result!.usage.cacheCreationTokens).toBe(200);
    expect(result!.usage.cacheReadTokens).toBe(300);
  });

  it('returns null for non-assistant records', () => {
    const line = JSON.stringify({ type: 'user', content: 'hello' });
    expect(parseSessionLine(line)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseSessionLine('not json')).toBeNull();
  });

  it('handles missing usage fields with defaults of 0', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'abc',
      timestamp: '2026-03-01T10:00:00.000Z',
      message: { model: 'claude-opus-4-6', usage: { input_tokens: 10, output_tokens: 5 } },
    });
    const result = parseSessionLine(line);
    expect(result!.usage.cacheCreationTokens).toBe(0);
    expect(result!.usage.cacheReadTokens).toBe(0);
  });
});

describe('parseHistoryLine', () => {
  it('extracts session info from history entry', () => {
    const line = JSON.stringify({
      project: 'D:\\MyProject',
      sessionId: 'abc-123',
      timestamp: 1709290800000,
    });
    const result = parseHistoryLine(line);
    expect(result).not.toBeNull();
    expect(result!.project).toBe('D:\\MyProject');
    expect(result!.sessionId).toBe('abc-123');
  });

  it('returns null for lines without sessionId', () => {
    const line = JSON.stringify({ display: 'hello' });
    expect(parseHistoryLine(line)).toBeNull();
  });
});

describe('calculateCost', () => {
  it('calculates cost for known model', () => {
    const cost = calculateCost('claude-opus-4-6', {
      inputTokens: 1000000,
      outputTokens: 1000000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    expect(cost).toBeCloseTo(90, 1);
  });

  it('uses default pricing for unknown model', () => {
    const cost = calculateCost('unknown-model', {
      inputTokens: 1000000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    expect(cost).toBeCloseTo(3, 1);
  });
});
