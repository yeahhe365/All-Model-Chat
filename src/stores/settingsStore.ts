import { create } from 'zustand';
import { AppSettings } from '../types';
import type { SyncMessage } from '../types/sync';
import { Theme } from '../types/theme';
import { DEFAULT_FILES_API_CONFIG, getDefaultAppSettings } from '../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../constants/themeConstants';
import { logService } from '../services/logService';
import { resolveSupportedModelId } from '../utils/modelHelpers';
import { dbService } from '../utils/db';

interface SettingsState {
  appSettings: AppSettings;
  currentTheme: Theme;
  language: 'en' | 'zh';
  isSettingsLoaded: boolean;
  pendingPreloadSettingsOverrides: Partial<AppSettings> | null;
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
  return AVAILABLE_THEMES.find((t) => t.id === resolvedId) || AVAILABLE_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

function sanitizeAppSettings(settings: AppSettings): AppSettings {
  const defaultSettings = getDefaultAppSettings();
  return {
    ...settings,
    modelId: resolveSupportedModelId(settings.modelId, defaultSettings.modelId),
    transcriptionModelId: resolveSupportedModelId(
      settings.transcriptionModelId,
      defaultSettings.transcriptionModelId,
    ),
  };
}

let settingsChannel: BroadcastChannel | null = null;

function collectChangedSettings(
  previous: AppSettings,
  next: AppSettings,
): Partial<AppSettings> {
  const changedEntries = Object.keys(next)
    .filter((key) => !Object.is(previous[key as keyof AppSettings], next[key as keyof AppSettings]))
    .map((key) => [key, next[key as keyof AppSettings]]);

  return Object.fromEntries(changedEntries) as Partial<AppSettings>;
}

function getSettingsChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!settingsChannel) {
    settingsChannel = new BroadcastChannel('all_model_chat_sync_v1');
  }

  return settingsChannel;
}

function buildDefaultSettingsState() {
  const appSettings = getDefaultAppSettings();
  return {
    appSettings,
    currentTheme: computeTheme(appSettings.themeId),
    language: resolveLanguage(appSettings.language),
  };
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ...buildDefaultSettingsState(),
  isSettingsLoaded: false,
  pendingPreloadSettingsOverrides: null,

  setAppSettings: (v) => {
    set((state) => {
      const next = typeof v === 'function' ? v(state.appSettings) : v;
      const sanitizedNext = sanitizeAppSettings(next);
      const currentTheme = computeTheme(sanitizedNext.themeId);
      const language = resolveLanguage(sanitizedNext.language);

      if (state.isSettingsLoaded) {
        dbService.setAppSettings(sanitizedNext)
          .then(() => getSettingsChannel()?.postMessage({ type: 'SETTINGS_UPDATED' }))
          .catch((e) => logService.error('Failed to save settings', { error: e }));
        return {
          appSettings: sanitizedNext,
          currentTheme,
          language,
          pendingPreloadSettingsOverrides: null,
        };
      } else {
        const changedSettings = collectChangedSettings(state.appSettings, sanitizedNext);
        return {
          appSettings: sanitizedNext,
          currentTheme,
          language,
          pendingPreloadSettingsOverrides: {
            ...(state.pendingPreloadSettingsOverrides ?? {}),
            ...changedSettings,
          },
        };
      }
    });
  },

  loadSettings: async () => {
    try {
      const defaultSettings = getDefaultAppSettings();
      const storedSettings = await dbService.getAppSettings();
      const preloadOverrides = useSettingsStore.getState().pendingPreloadSettingsOverrides;

      if (storedSettings) {
        const newSettings = sanitizeAppSettings({
          ...defaultSettings,
          ...storedSettings,
          ...(preloadOverrides ?? {}),
        });
        if (storedSettings.filesApiConfig) {
          newSettings.filesApiConfig = { ...DEFAULT_FILES_API_CONFIG, ...storedSettings.filesApiConfig };
        }
        if (preloadOverrides?.filesApiConfig) {
          newSettings.filesApiConfig = {
            ...newSettings.filesApiConfig,
            ...preloadOverrides.filesApiConfig,
          };
        }
        set({
          appSettings: newSettings,
          currentTheme: computeTheme(newSettings.themeId),
          language: resolveLanguage(newSettings.language),
          isSettingsLoaded: true,
          pendingPreloadSettingsOverrides: null,
        });
        if (preloadOverrides) {
          dbService.setAppSettings(newSettings)
            .then(() => getSettingsChannel()?.postMessage({ type: 'SETTINGS_UPDATED' }))
            .catch((e) => logService.error('Failed to save settings', { error: e }));
        }
      } else {
        const newSettings = sanitizeAppSettings({
          ...defaultSettings,
          ...(preloadOverrides ?? {}),
        });
        if (preloadOverrides?.filesApiConfig) {
          newSettings.filesApiConfig = {
            ...DEFAULT_FILES_API_CONFIG,
            ...preloadOverrides.filesApiConfig,
          };
        }
        set({
          appSettings: newSettings,
          currentTheme: computeTheme(newSettings.themeId),
          language: resolveLanguage(newSettings.language),
          isSettingsLoaded: true,
          pendingPreloadSettingsOverrides: null,
        });
        if (preloadOverrides) {
          dbService.setAppSettings(newSettings)
            .then(() => getSettingsChannel()?.postMessage({ type: 'SETTINGS_UPDATED' }))
            .catch((e) => logService.error('Failed to save settings', { error: e }));
        }
      }
    } catch (error) {
      logService.error('Failed to load settings from IndexedDB', { error });
      set({ isSettingsLoaded: true });
    }
  },

  broadcastSettingsUpdate: () => {
    getSettingsChannel()?.postMessage({ type: 'SETTINGS_UPDATED' });
  },
}));

if (typeof BroadcastChannel !== 'undefined') {
  const channel = getSettingsChannel();
  if (channel) {
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (msg.type === 'SETTINGS_UPDATED') {
        logService.info('[Sync] Reloading settings from DB');
        useSettingsStore.getState().loadSettings();
      }
    };
  }
}

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
