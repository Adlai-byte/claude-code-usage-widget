import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI?.getSettings().then((saved) => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await window.electronAPI?.saveSettings(next);
  }, [settings]);

  return { settings, updateSettings };
}
