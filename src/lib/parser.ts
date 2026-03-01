import { SessionRecord, SessionInfo, TokenUsage, MODEL_PRICING, DEFAULT_PRICING } from '../types';

export function parseSessionLine(line: string): SessionRecord | null {
  try {
    const data = JSON.parse(line);
    if (data.type !== 'assistant') return null;

    // usage lives inside data.message (Claude Code log format)
    const rawUsage = data.message?.usage ?? data.usage;
    if (!rawUsage) return null;

    const usage: TokenUsage = {
      inputTokens: rawUsage.input_tokens ?? 0,
      outputTokens: rawUsage.output_tokens ?? 0,
      cacheCreationTokens: rawUsage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: rawUsage.cache_read_input_tokens ?? 0,
    };

    return {
      sessionId: data.sessionId ?? '',
      timestamp: new Date(data.timestamp).getTime(),
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

    return {
      sessionId: data.sessionId,
      project: data.project ?? 'Unknown',
      timestamp: data.timestamp ?? 0,
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
