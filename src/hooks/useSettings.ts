import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI?.getSettings().then((saved) => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
    });
  }, []);

  // Compute merged state inside updater, fire save as side effect
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      window.electronAPI?.saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
