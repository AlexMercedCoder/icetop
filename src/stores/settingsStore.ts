import { create } from 'zustand';
import type { AppSettings, Theme } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setTheme: (theme: Theme) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings: AppSettings = await (window as any).icetop.settings.get();
      document.documentElement.setAttribute('data-theme', settings.theme);
      set({ settings, isLoaded: true });
    } catch {
      // Use defaults and mark as loaded
      set({ isLoaded: true });
    }
  },

  updateSettings: async (partial) => {
    const merged = { ...get().settings, ...partial };
    try {
      await (window as any).icetop.settings.update(merged);
      if (partial.theme) {
        document.documentElement.setAttribute('data-theme', partial.theme);
      }
      set({ settings: merged });
    } catch (err: any) {
      console.error('Failed to save settings:', err);
    }
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    get().updateSettings({ theme });
  },
}));
