import Sparkline from './Sparkline';
import { UsageData, AppSettings } from '../types';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

function getBudgetStatus(current: number, budget: number, threshold: number): 'ok' | 'warn' | 'danger' {
  if (budget <= 0) return 'ok';
  const ratio = current / budget;
  if (ratio >= 0.9) return 'danger';
  if (ratio >= threshold) return 'warn';
  return 'ok';
}

interface Props {
  data: UsageData;
  settings: AppSettings;
  onExpand: () => void;
}

export default function CompactWidget({ data, settings, onExpand }: Props) {
  const budgetStatus = getBudgetStatus(data.todayTokens, settings.dailyBudget, settings.alertThreshold);

  return (
    <div onClick={onExpand} className="cursor-pointer h-full flex flex-col justify-between p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-secondary)' }}>Claude Code Usage</span>
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} title="Monitoring active" />
      </div>
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatTokens(data.todayTokens)}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>tokens today</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold" style={{ color: budgetStatus === 'danger' ? 'var(--danger)' : budgetStatus === 'warn' ? 'var(--warning)' : 'var(--accent)' }}>
            {formatCost(data.todayCost)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{data.todaySessions} session{data.todaySessions !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {settings.dailyBudget > 0 && (
        <div className="mb-2">
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: Math.min(100, (data.todayTokens / settings.dailyBudget) * 100) + '%',
              background: budgetStatus === 'danger' ? 'var(--danger)' : budgetStatus === 'warn' ? 'var(--warning)' : 'var(--accent)',
            }} />
          </div>
        </div>
      )}
      <Sparkline data={data.dailyUsage} />
    </div>
  );
}
