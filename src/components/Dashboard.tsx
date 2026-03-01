import { useState } from 'react';
import { UsageData, AppSettings } from '../types';
import TokenChart from './charts/TokenChart';
import SessionChart from './charts/SessionChart';
import ProjectChart from './charts/ProjectChart';
import ModelBreakdown from './charts/ModelBreakdown';
import ActivityHeatmap from './charts/ActivityHeatmap';
import SettingsPanel from './SettingsPanel';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

interface Props {
  data: UsageData;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onCollapse: () => void;
  onRefresh: () => void;
}

export default function Dashboard({ data, settings, onUpdateSettings, onCollapse, onRefresh }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onCollapse} className="text-xs px-2 py-1 rounded hover:opacity-80" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Compact</button>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Claude Code Usage</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="text-xs px-2 py-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Refresh</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-xs px-2 py-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Settings</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Tokens', value: formatTokens(data.totalTokens) },
            { label: 'Total Cost', value: '$' + data.totalCost.toFixed(2) },
            { label: 'Sessions', value: data.totalSessions.toString() },
            { label: 'Projects', value: data.projectUsage.length.toString() },
          ].map(card => (
            <div key={card.label} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
            </div>
          ))}
        </div>
        {showSettings && <SettingsPanel settings={settings} onUpdate={onUpdateSettings} onClose={() => setShowSettings(false)} />}
        <TokenChart data={data.dailyUsage} />
        <div className="grid grid-cols-2 gap-3">
          <SessionChart data={data.dailyUsage} />
          <ModelBreakdown data={data.modelUsage} />
        </div>
        <ActivityHeatmap data={data.heatmap} />
        <ProjectChart data={data.projectUsage} />
      </div>
    </div>
  );
}
