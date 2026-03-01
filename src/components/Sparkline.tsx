import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { DailyUsage } from '../types';

interface Props {
  data: DailyUsage[];
}

export default function Sparkline({ data }: Props) {
  const last7 = data.slice(-7);
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={last7}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="inputTokens" stroke="var(--accent)" strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
