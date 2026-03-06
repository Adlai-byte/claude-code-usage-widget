import { SessionRecord, SessionInfo, TokenUsage, MODEL_PRICING, DEFAULT_PRICING } from '../types';

export function parseSessionLine(line: string): SessionRecord | null {
  try {
    const data = JSON.parse(line);
    if (data.type !== 'assistant') return null;

    // usage lives inside data.message (Claude Code log format)
    const rawUsage = data.message?.usage ?? data.usage;
    if (!rawUsage) return null;

    // Fix #5: Validate timestamp — NaN would crash toISOString() in aggregator
    const timestamp = new Date(data.timestamp).getTime();
    if (isNaN(timestamp)) return null;

    const usage: TokenUsage = {
      inputTokens: rawUsage.input_tokens ?? 0,
      outputTokens: rawUsage.output_tokens ?? 0,
      cacheCreationTokens: rawUsage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: rawUsage.cache_read_input_tokens ?? 0,
    };

    return {
      sessionId: data.sessionId ?? '',
      timestamp,
      model: data.message?.model ?? 'unknown',
      usage,
    };
  } catch {
    return null;
  }
}

export function parseHistoryLine(line: string): SessionInfo | null {
  try {
    const data = JSON.parse(line);
    if (!data.sessionId) return null;

    // Fix #14: Always convert timestamp to number (source may be ISO string)
    const timestamp = typeof data.timestamp === 'number'
      ? data.timestamp
      : new Date(data.timestamp).getTime() || 0;

    return {
      sessionId: data.sessionId,
      project: data.project ?? 'Unknown',
      timestamp,
    };
  } catch {
    return null;
  }
}

export function calculateCost(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (
    usage.inputTokens * pricing.input +
    usage.outputTokens * pricing.output +
    usage.cacheCreationTokens * pricing.cacheWrite +
    usage.cacheReadTokens * pricing.cacheRead
  );
}
