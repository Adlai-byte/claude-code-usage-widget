import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI?.getSettings().then((saved) => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
    });
  }, []);

  // Fix #2: Use functional updater to avoid stale closure on rapid updates
  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    let next: AppSettings = DEFAULT_SETTINGS;
    setSettings(prev => {
      next = { ...prev, ...partial };
      return next;
    });
    await window.electronAPI?.saveSettings(next);
  }, []);

  return { settings, updateSettings };
}
