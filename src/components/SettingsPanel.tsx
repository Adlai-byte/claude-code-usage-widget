import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Settings</h3>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>Close</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Refresh Interval</label>
          <select value={settings.refreshInterval} onChange={e => onUpdate({ refreshInterval: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={0}>Manual only</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Daily Token Budget (0 = no limit)</label>
          <input type="number" value={settings.dailyBudget} onChange={e => onUpdate({ dailyBudget: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} min={0} step={100000} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Weekly Token Budget (0 = no limit)</label>
          <input type="number" value={settings.weeklyBudget} onChange={e => onUpdate({ weeklyBudget: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} min={0} step={500000} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Monthly Token Budget (0 = no limit)</label>
          <input type="number" value={settings.monthlyBudget} onChange={e => onUpdate({ monthlyBudget: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} min={0} step={1000000} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Warning Threshold</label>
          <select value={settings.alertThreshold} onChange={e => onUpdate({ alertThreshold: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={0.9}>90%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
