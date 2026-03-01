import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProjectUsage } from '../../types';

interface Props { data: ProjectUsage[]; }

function formatK(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

export default function ProjectChart({ data }: Props) {
  const top10 = data.slice(0, 10);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Top Projects by Tokens</h3>
      <ResponsiveContainer width="100%" height={Math.max(150, top10.length * 32)}>
        <BarChart data={top10} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={formatK} />
          <YAxis type="category" dataKey="displayName" tick={{ fontSize: 11, fill: 'var(--text-primary)' }} width={120} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(val: number) => [formatK(val), 'Tokens']} />
          <Bar dataKey="totalTokens" fill="var(--accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
