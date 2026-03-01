import { useState, useCallback } from 'react';
import { useUsageData } from './hooks/useUsageData';
import { useSettings } from './hooks/useSettings';
import CompactWidget from './components/CompactWidget';
import Dashboard from './components/Dashboard';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const { data, loading, refresh } = useUsageData(settings.refreshInterval);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(async () => {
    const result = await window.electronAPI?.toggleExpand();
    setExpanded(result ?? false);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (!expanded) {
    return <CompactWidget data={data} settings={settings} onExpand={handleToggle} />;
  }

  return (
    <Dashboard data={data} settings={settings} onUpdateSettings={updateSettings} onCollapse={handleToggle} onRefresh={refresh} />
  );
}
