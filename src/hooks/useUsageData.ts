import { useState, useEffect, useCallback } from 'react';
import { UsageData } from '../types';

declare global {
  interface Window {
    electronAPI?: {
      getUsageData: () => Promise<UsageData>;
      onDataUpdate: (cb: (data: UsageData) => void) => () => void;
      toggleExpand: () => Promise<boolean>;
      getExpanded: () => Promise<boolean>;
      getSettings: () => Promise<any>;
      saveSettings: (s: any) => Promise<boolean>;
    };
  }
}

const EMPTY_DATA: UsageData = {
  totalTokens: 0, totalCost: 0, totalSessions: 0,
  todayTokens: 0, todayCost: 0, todaySessions: 0,
  weekTokens: 0, weekCost: 0, weekSessions: 0,
  currentSessionId: '', currentSessionTokens: 0, currentSessionCost: 0,
  dailyUsage: [], projectUsage: [], heatmap: [], modelUsage: [],
  lastUpdated: 0,
  planUsage: null,
  tokenStatus: 'missing' as const,
};

export function useUsageData(_refreshInterval: number) {
  const [data, setData] = useState<UsageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.getUsageData();
      setData(result);
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Rely on main process server-push for updates (file watcher + 60s plan usage timer)
    const cleanup = window.electronAPI?.onDataUpdate((data) => {
      setData(data);
    });
    return () => cleanup?.();
  }, [loadData]);

  return { data, loading, refresh: loadData };
}
