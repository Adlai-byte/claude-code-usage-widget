import { useState, useEffect, useCallback, useRef } from 'react';
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
};

export function useUsageData(refreshInterval: number) {
  const [data, setData] = useState<UsageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
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
    const cleanup = window.electronAPI?.onDataUpdate((data) => {
      setData(data);
    });
    return () => cleanup?.();
  }, [loadData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(loadData, refreshInterval);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refreshInterval, loadData]);

  return { data, loading, refresh: loadData };
}
