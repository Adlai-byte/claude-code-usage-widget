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
  onMinimize: () => void;
  onClose: () => void;
}

export default function Dashboard({ data, settings, onUpdateSettings, onCollapse, onRefresh, onMinimize, onClose }: Props) {
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
          <button onClick={onMinimize} className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80" style={{ color: 'var(--danger, #ef4444)' }} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Plan usage bars */}
        {data.planUsage && (data.planUsage.fiveHour || data.planUsage.sevenDay) && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>
              {data.planUsage.subscriptionType ? `${data.planUsage.subscriptionType.charAt(0).toUpperCase() + data.planUsage.subscriptionType.slice(1)} Plan` : 'Plan'} Usage
            </div>
            {data.planUsage.fiveHour && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--text-primary)' }}>Session (5h window)</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{Math.round(data.planUsage.fiveHour.utilization)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full" style={{ width: Math.round(data.planUsage.fiveHour.utilization) + '%', background: data.planUsage.fiveHour.utilization >= 90 ? '#ef4444' : data.planUsage.fiveHour.utilization >= 75 ? '#f59e0b' : '#3b82f6' }} />
                </div>
              </div>
            )}
            {data.planUsage.sevenDay && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--text-primary)' }}>Weekly (all models)</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{Math.round(data.planUsage.sevenDay.utilization)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full" style={{ width: Math.round(data.planUsage.sevenDay.utilization) + '%', background: data.planUsage.sevenDay.utilization >= 90 ? '#ef4444' : data.planUsage.sevenDay.utilization >= 75 ? '#f59e0b' : '#3b82f6' }} />
                </div>
              </div>
            )}
            {data.planUsage.sevenDaySonnet && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--text-primary)' }}>Weekly (Sonnet)</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{Math.round(data.planUsage.sevenDaySonnet.utilization)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full" style={{ width: Math.round(data.planUsage.sevenDaySonnet.utilization) + '%', background: data.planUsage.sevenDaySonnet.utilization >= 90 ? '#ef4444' : data.planUsage.sevenDaySonnet.utilization >= 75 ? '#f59e0b' : '#3b82f6' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current session highlight */}
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--border))' }}>
          <div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--accent)' }}>Current Session</div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{data.currentSessionId.slice(0, 8)}...</div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatTokens(data.currentSessionTokens)}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>tokens</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>${data.currentSessionCost.toFixed(2)}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>cost</div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', tokens: formatTokens(data.todayTokens), cost: '$' + data.todayCost.toFixed(2), sub: data.todaySessions + ' sessions' },
            { label: 'This Week', tokens: formatTokens(data.weekTokens), cost: '$' + data.weekCost.toFixed(2), sub: data.weekSessions + ' sessions' },
            { label: 'All Time', tokens: formatTokens(data.totalTokens), cost: '$' + data.totalCost.toFixed(2), sub: data.totalSessions + ' sessions' },
          ].map(card => (
            <div key={card.label} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.tokens}</div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{card.cost}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{card.sub}</span>
              </div>
            </div>
          ))}
        </div>
        {showSettings && <SettingsPanel settings={settings} onUpdate={onUpdateSettings} onClose={() => setShowSettings(false)} accountInfo={data.accountInfo} tokenStatus={data.tokenStatus} />}
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
