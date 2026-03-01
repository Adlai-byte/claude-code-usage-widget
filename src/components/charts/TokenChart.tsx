import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DailyUsage } from '../../types';

interface Props { data: DailyUsage[]; }

function formatK(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

export default function TokenChart({ data }: Props) {
  const last30 = data.slice(-30);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Token Usage (30d)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={last30}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={formatK} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text-primary)' }} formatter={(val: number, name: string) => [formatK(val), name]} />
          <Area type="monotone" dataKey="inputTokens" name="Input" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          <Area type="monotone" dataKey="outputTokens" name="Output" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          <Area type="monotone" dataKey="cacheReadTokens" name="Cache Read" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
