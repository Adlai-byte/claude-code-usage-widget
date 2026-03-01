import { ModelUsage } from '../../types';

interface Props { data: ModelUsage[]; }

export default function ModelBreakdown({ data }: Props) {
  const total = data.reduce((sum, m) => sum + m.estimatedCost, 0);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Cost by Model</h3>
      <div className="space-y-3">
        {data.map((m) => {
          const pct = total > 0 ? (m.estimatedCost / total) * 100 : 0;
          return (
            <div key={m.model}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-primary)' }}>{m.displayName}</span>
                <span style={{ color: 'var(--text-secondary)' }}>${m.estimatedCost.toFixed(2)} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
