import { useState, useCallback, useEffect } from 'react';
import { useUsageData } from './hooks/useUsageData';
import { useSettings } from './hooks/useSettings';
import { ACCENT_COLORS } from './types';
import CompactWidget from './components/CompactWidget';
import Dashboard from './components/Dashboard';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const { data, loading, refresh } = useUsageData(settings.refreshInterval);
  const [expanded, setExpanded] = useState(false);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Apply accent color as CSS variable overrides
  useEffect(() => {
    const colors = ACCENT_COLORS[settings.accentColor];
    if (colors) {
      document.documentElement.style.setProperty('--accent', colors.main);
      document.documentElement.style.setProperty('--accent-light', colors.light);
    }
  }, [settings.accentColor]);

  // Apply window opacity
  useEffect(() => {
    window.electronAPI?.setOpacity(settings.windowOpacity);
  }, [settings.windowOpacity]);

  const handleToggle = useCallback(async () => {
    const result = await window.electronAPI?.toggleExpand();
    setExpanded(result ?? false);
  }, []);

  const handleMinimize = useCallback(() => {
    window.electronAPI?.minimizeWindow();
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.closeWindow();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (!expanded) {
    return <CompactWidget data={data} settings={settings} onExpand={handleToggle} onMinimize={handleMinimize} onClose={handleClose} />;
  }

  return (
    <Dashboard data={data} settings={settings} onUpdateSettings={updateSettings} onCollapse={handleToggle} onRefresh={refresh} onMinimize={handleMinimize} onClose={handleClose} />
  );
}
