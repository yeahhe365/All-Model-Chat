import { create } from 'zustand';
import { AppSettings } from '../types';
import type { SyncMessage } from '../types/sync';
import { Theme } from '../types/theme';
import { DEFAULT_APP_SETTINGS, DEFAULT_FILES_API_CONFIG } from '../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../constants/themeConstants';
import { logService, resolveSupportedModelId } from '../utils/appUtils';
import { dbService } from '../utils/db';

interface SettingsState {
  appSettings: AppSettings;
  currentTheme: Theme;
  language: 'en' | 'zh';
  isSettingsLoaded: boolean;
}

interface SettingsActions {
  setAppSettings: (v: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  loadSettings: () => Promise<void>;
  broadcastSettingsUpdate: () => void;
}

function resolveThemeId(themeId: string): 'onyx' | 'pearl' {
  if (themeId === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'onyx' : 'pearl';
  }
  return themeId as 'onyx' | 'pearl';
}

function resolveLanguage(language: string): 'en' | 'zh' {
  const settingLang = language || 'system';
  if (settingLang === 'system') {
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  }
  return settingLang as 'en' | 'zh';
}

function computeTheme(themeId: string): Theme {
  const resolvedId = resolveThemeId(themeId);
  return AVAILABLE_THEMES.find(t => t.id === resolvedId) || AVAILABLE_THEMES.find(t => t.id === DEFAULT_THEME_ID)!;
}

function sanitizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    modelId: resolveSupportedModelId(settings.modelId, DEFAULT_APP_SETTINGS.modelId),
    transcriptionModelId: resolveSupportedModelId(
      settings.transcriptionModelId,
      DEFAULT_APP_SETTINGS.transcriptionModelId,
    ),
  };
}

// BroadcastChannel singleton for settings sync
let settingsChannel: BroadcastChannel | null = null;
function getSettingsChannel(): BroadcastChannel {
  if (!settingsChannel) {
    settingsChannel = new BroadcastChannel('all_model_chat_sync_v1');
  }
  return settingsChannel;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  appSettings: DEFAULT_APP_SETTINGS,
  currentTheme: computeTheme(DEFAULT_APP_SETTINGS.themeId),
  language: resolveLanguage(DEFAULT_APP_SETTINGS.language),
  isSettingsLoaded: false,

  setAppSettings: (v) => {
    set((state) => {
      const next = typeof v === 'function' ? v(state.appSettings) : v;
      const sanitizedNext = sanitizeAppSettings(next);
      const currentTheme = computeTheme(sanitizedNext.themeId);
      const language = resolveLanguage(sanitizedNext.language);

      // Persist to IndexedDB
      if (state.isSettingsLoaded) {
        dbService.setAppSettings(sanitizedNext)
          .then(() => getSettingsChannel().postMessage({ type: 'SETTINGS_UPDATED' }))
          .catch((e) => logService.error('Failed to save settings', { error: e }));
      }

      return { appSettings: sanitizedNext, currentTheme, language };
    });
  },

  loadSettings: async () => {
    try {
      const storedSettings = await dbService.getAppSettings();
      if (storedSettings) {
        const newSettings = sanitizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...storedSettings });
        if (storedSettings.filesApiConfig) {
          newSettings.filesApiConfig = { ...DEFAULT_FILES_API_CONFIG, ...storedSettings.filesApiConfig };
        }
        set({
          appSettings: newSettings,
          currentTheme: computeTheme(newSettings.themeId),
          language: resolveLanguage(newSettings.language),
          isSettingsLoaded: true,
        });
      } else {
        set({ isSettingsLoaded: true });
      }
    } catch (error) {
      logService.error('Failed to load settings from IndexedDB', { error });
      set({ isSettingsLoaded: true });
    }
  },

  broadcastSettingsUpdate: () => {
    getSettingsChannel().postMessage({ type: 'SETTINGS_UPDATED' });
  },
}));

// Setup BroadcastChannel listener for multi-tab settings sync
if (typeof BroadcastChannel !== 'undefined') {
  const channel = getSettingsChannel();
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (msg.type === 'SETTINGS_UPDATED') {
      logService.info('[Sync] Reloading settings from DB');
      useSettingsStore.getState().loadSettings();
    }
  };
}

// Listen for system theme changes when using 'system' theme
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const { appSettings } = useSettingsStore.getState();
    if (appSettings.themeId === 'system') {
      const currentTheme = computeTheme(appSettings.themeId);
      useSettingsStore.setState({ currentTheme });
    }
  });
}
