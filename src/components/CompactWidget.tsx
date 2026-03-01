import { UsageData, AppSettings, PlanUsageTier } from '../types';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

function getResetLabel(resetsAt: string | null): string {
  if (!resetsAt) return 'No active window';
  const resetTime = new Date(resetsAt).getTime();
  const now = Date.now();
  const diffMs = resetTime - now;
  if (diffMs <= 0) return 'Resetting...';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Resets in ${days}d ${hours % 24}h`;
  }
  return `Resets in ${hours} hr ${mins} min`;
}

function getBarColor(pct: number): string {
  if (pct >= 90) return '#ef4444';
  if (pct >= 75) return '#f59e0b';
  return '#3b82f6';
}

const ZERO_TIER: PlanUsageTier = { utilization: 0, resetsAt: null };

function UsageBar({ label, tier }: { label: string; tier: PlanUsageTier }) {
  const pct = Math.round(tier.utilization);
  return (
    <div className="mb-2">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="text-xs font-semibold" style={{ color: '#e5e5e5' }}>{label}</div>
          <div className="text-[11px]" style={{ color: '#8b9a7b' }}>{getResetLabel(tier.resetsAt)}</div>
        </div>
        <div className="text-xs text-right" style={{ color: '#9ca3af' }}>
          {pct}% used
        </div>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: '#3a3a40' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: Math.max(pct, 1) + '%',
            background: pct === 0 ? '#4b5563' : getBarColor(pct),
          }}
        />
      </div>
    </div>
  );
}

interface Props {
  data: UsageData;
  settings: AppSettings;
  onExpand: () => void;
}

export default function CompactWidget({ data, settings, onExpand }: Props) {
  const plan = data.planUsage;

  return (
    <div
      onClick={onExpand}
      className="cursor-pointer h-full flex flex-col p-5 rounded-xl"
      style={{ background: '#2a2a2e', border: '1px solid #3a3a40', color: '#e5e5e5' }}
    >
      {/* Header */}
      <h2 className="text-sm font-bold mb-4" style={{ color: '#d4a843' }}>Plan usage limits</h2>

      {plan ? (
        <>
          {/* Current session (5-hour window) */}
          <UsageBar label="Current session" tier={plan.fiveHour ?? ZERO_TIER} />

          {/* Divider */}
          <div className="my-3" style={{ borderTop: '1px solid #3a3a40' }} />

          {/* Weekly limits header */}
          <h2 className="text-sm font-bold mb-3" style={{ color: '#d4a843' }}>Weekly limits</h2>

          {/* All models (7-day) — always show */}
          <UsageBar label="All models" tier={plan.sevenDay ?? ZERO_TIER} />

          {/* Sonnet */}
          {plan.sevenDaySonnet && (
            <div className="mt-2">
              <UsageBar label="Sonnet" tier={plan.sevenDaySonnet} />
            </div>
          )}

          {/* Opus */}
          {plan.sevenDayOpus && (
            <div className="mt-2">
              <UsageBar label="Opus" tier={plan.sevenDayOpus} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fallback: show local token data when API data unavailable */}
          <div className="text-[11px] mb-2" style={{ color: '#9ca3af' }}>
            Connecting to Claude API...
          </div>
          <div className="mb-2">
            <div className="text-xs font-semibold mb-1" style={{ color: '#e5e5e5' }}>
              Session: {formatTokens(data.currentSessionTokens)} tokens
            </div>
            <div className="text-xs" style={{ color: '#9ca3af' }}>
              Week: {formatTokens(data.weekTokens)} &middot; {formatCost(data.weekCost)}
            </div>
          </div>
        </>
      )}

      {/* Footer: plan type + today summary */}
      <div className="mt-auto pt-3 flex justify-between text-[10px]" style={{ color: '#6b7280' }}>
        <span>
          {plan?.subscriptionType
            ? `${plan.subscriptionType.charAt(0).toUpperCase() + plan.subscriptionType.slice(1)} plan`
            : 'Loading...'}
        </span>
        <span>Today: {formatTokens(data.todayTokens)} &middot; {formatCost(data.todayCost)}</span>
      </div>
    </div>
  );
}
