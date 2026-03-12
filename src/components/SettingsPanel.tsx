import { AppSettings, ThemeMode, AccentColor, ACCENT_COLORS } from '../types';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'indigo', label: 'Indigo' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
];

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Settings</h3>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>Close</button>
      </div>
      <div className="space-y-4">
        {/* Appearance section */}
        <div className="pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--accent)' }}>Appearance</h4>

          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Theme</label>
            <div className="flex gap-1">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ theme: opt.value })}
                  className="flex-1 text-xs py-1.5 rounded transition-all"
                  style={{
                    background: settings.theme === opt.value ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: settings.theme === opt.value ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (settings.theme === opt.value ? 'var(--accent)' : 'var(--border)'),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Accent Color</label>
            <div className="flex gap-1.5">
              {ACCENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ accentColor: opt.value })}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: ACCENT_COLORS[opt.value].main,
                    border: settings.accentColor === opt.value ? '2px solid var(--text-primary)' : '2px solid transparent',
                    outline: settings.accentColor === opt.value ? '2px solid var(--accent)' : 'none',
                  }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Window Opacity: {settings.windowOpacity}%
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={settings.windowOpacity}
              onChange={e => onUpdate({ windowOpacity: Number(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Data section */}
        <div>
          <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--accent)' }}>Data</h4>

          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Refresh Interval</label>
            <select value={settings.refreshInterval} onChange={e => onUpdate({ refreshInterval: Number(e.target.value) })}
              className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
              <option value={0}>Manual only</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Daily Token Budget (0 = no limit)</label>
            <input type="number" value={settings.dailyBudget} onChange={e => onUpdate({ dailyBudget: Number(e.target.value) })}
              className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} min={0} step={100000} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Weekly Token Budget (0 = no limit)</label>
            <input type="number" value={settings.weeklyBudget} onChange={e => onUpdate({ weeklyBudget: Number(e.target.value) })}
              className="w-full text-sm rounded px-2 py-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} min={0} step={500000} />
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
    </div>
  );
}
