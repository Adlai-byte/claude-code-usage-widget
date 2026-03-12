import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI?.getSettings().then((saved) => {
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        setSettings(merged);
        settingsRef.current = merged;
      }
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...partial };
    settingsRef.current = next;
    setSettings(next);
    window.electronAPI?.saveSettings(next);
  }, []);

  return { settings, updateSettings };
}
