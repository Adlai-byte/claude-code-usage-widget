import { useState, useEffect, useCallback, useRef } from 'react';
import { UsageData } from '../types';
import { parseSessionLine, parseHistoryLine } from '../lib/parser';
import { aggregateUsage } from '../lib/aggregator';

declare global {
  interface Window {
    electronAPI?: {
      getUsageData: () => Promise<{ historyLines: string[]; sessionLines: string[] }>;
      onDataUpdate: (cb: (data: { historyLines: string[]; sessionLines: string[] }) => void) => () => void;
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
  dailyUsage: [], projectUsage: [], heatmap: [], modelUsage: [],
  lastUpdated: 0,
};

function processRawData(raw: { historyLines: string[]; sessionLines: string[] }): UsageData {
  const records = raw.sessionLines.map(parseSessionLine).filter(Boolean) as any[];
  const infos = raw.historyLines.map(parseHistoryLine).filter(Boolean) as any[];
  return aggregateUsage(records, infos);
}

export function useUsageData(refreshInterval: number) {
  const [data, setData] = useState<UsageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const raw = await window.electronAPI.getUsageData();
      setData(processRawData(raw));
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const cleanup = window.electronAPI?.onDataUpdate((raw) => {
      setData(processRawData(raw));
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
