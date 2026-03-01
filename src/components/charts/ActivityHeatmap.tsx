import { HeatmapCell } from '../../types';

interface Props { data: HeatmapCell[]; }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ActivityHeatmap({ data }: Props) {
  const cellMap = new Map<string, number>();
  let maxCount = 1;
  for (const cell of data) {
    const key = `${cell.day}-${cell.hour}`;
    cellMap.set(key, cell.count);
    if (cell.count > maxCount) maxCount = cell.count;
  }

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Activity Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5">
          <div className="flex flex-col gap-0.5 mr-1">
            {DAYS.map(d => (
              <div key={d} className="h-4 flex items-center text-[9px]" style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }, (_, day) => {
                const count = cellMap.get(`${day}-${hour}`) ?? 0;
                const intensity = count / maxCount;
                return (
                  <div key={day} className="w-4 h-4 rounded-sm" title={`${DAYS[day]} ${hour}:00 — ${count} messages`}
                    style={{ background: count === 0 ? 'var(--border)' : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, var(--border))` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex mt-1 ml-7">
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <div key={h} className="text-[9px]" style={{ color: 'var(--text-secondary)', width: `${(3 / 24) * 100}%` }}>{h}:00</div>
          ))}
        </div>
      </div>
    </div>
  );
}
