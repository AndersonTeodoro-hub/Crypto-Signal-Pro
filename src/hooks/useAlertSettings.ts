import { useState, useEffect, useCallback } from 'react';

export interface AlertSettings {
  enabled: boolean;           // Master toggle (also unlocks AudioContext)
  soundEnabled: boolean;      // Play beep sounds
  desktopEnabled: boolean;    // Show browser notifications
  volume: number;             // 0.0 - 1.0 (default 0.7)
  cooldownSec: number;        // Minimum seconds between alerts (default 30)
  gradeFilter: 'all' | 'A' | 'A+';  // Filter by signal grade
  outcomeAlerts: boolean;     // Alert on TP/SL changes
}

const STORAGE_KEY = 'alert_settings';

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: false,
  soundEnabled: true,
  desktopEnabled: false,
  volume: 0.7,
  cooldownSec: 30,
  gradeFilter: 'all',
  outcomeAlerts: true,
};

function loadSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load alert settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AlertSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save alert settings:', e);
  }
}

export function getAlertSettings(): AlertSettings {
  return loadSettings();
}

export function setAlertSettings(settings: Partial<AlertSettings>): AlertSettings {
  const current = loadSettings();
  const updated = { ...current, ...settings };
  saveSettings(updated);
  return updated;
}

export function useAlertSettings() {
  const [settings, setSettingsState] = useState<AlertSettings>(loadSettings);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettingsState(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateSettings = useCallback((updates: Partial<AlertSettings>) => {
    const updated = { ...settings, ...updates };
    saveSettings(updated);
    setSettingsState(updated);
    return updated;
  }, [settings]);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isEnabled: settings.enabled,
    isSoundEnabled: settings.enabled && settings.soundEnabled,
    isDesktopEnabled: settings.enabled && settings.desktopEnabled,
    isOutcomeAlertsEnabled: settings.enabled && settings.outcomeAlerts,
  };
}
