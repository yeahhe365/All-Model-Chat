import { AppSettings, ChatSettings } from '../types';
import { API_KEY_LAST_USED_INDEX_KEY } from '../constants/appConstants';
import { logService } from '../services/logService';

export const SERVER_MANAGED_API_KEY = '__SERVER_MANAGED_API_KEY__';

type ServerManagedProxyEligibility = Pick<
  AppSettings,
  'serverManagedApi' | 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'
>;

export const isServerManagedApiEnabledForProxyRequests = (appSettings: ServerManagedProxyEligibility): boolean =>
  !!(
    appSettings.serverManagedApi &&
    appSettings.useCustomApiConfig &&
    appSettings.useApiProxy &&
    appSettings.apiProxyUrl?.trim()
  );

const getActiveApiConfig = (appSettings: AppSettings): { apiKeysString: string | null } => {
  const envWithGeminiKey = (
    import.meta as ImportMeta & {
      env?: {
        VITE_GEMINI_API_KEY?: string;
        VITE_OPENAI_API_KEY?: string;
      };
    }
  ).env;

  if (appSettings.apiMode === 'openai-compatible') {
    return {
      apiKeysString: appSettings.openaiCompatibleApiKey || envWithGeminiKey?.VITE_OPENAI_API_KEY || null,
    };
  }

  if (appSettings.useCustomApiConfig) {
    return {
      apiKeysString: appSettings.apiKey,
    };
  }
  return {
    apiKeysString: envWithGeminiKey?.VITE_GEMINI_API_KEY || null,
  };
};

export const parseApiKeys = (apiKeysString: string | null): string[] => {
  if (!apiKeysString) return [];
  return apiKeysString
    .split(/[\n,]+/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter((k) => k.length > 0);
};

export const getKeyForRequest = (
  appSettings: AppSettings,
  currentChatSettings: ChatSettings,
  options: { skipIncrement?: boolean; skipUsageLogging?: boolean } = {},
): { key: string; isNewKey: boolean } | { error: string } => {
  const { skipIncrement = false } = options;
  const { skipUsageLogging = false } = options;
  const isOpenAICompatibleMode = appSettings.apiMode === 'openai-compatible';
  const shouldUseServerManagedMarker =
    !isOpenAICompatibleMode && isServerManagedApiEnabledForProxyRequests(appSettings);

  const logUsage = (key: string) => {
    if (appSettings.useCustomApiConfig && !skipUsageLogging) {
      logService.recordApiKeyUsage(key);
    }
  };

  const { apiKeysString } = getActiveApiConfig(appSettings);
  if (!apiKeysString) {
    if (shouldUseServerManagedMarker) {
      return { key: SERVER_MANAGED_API_KEY, isNewKey: false };
    }
    return { error: 'API Key not configured.' };
  }

  const availableKeys = parseApiKeys(apiKeysString);

  if (availableKeys.length === 0) {
    if (shouldUseServerManagedMarker) {
      return { key: SERVER_MANAGED_API_KEY, isNewKey: false };
    }
    return { error: 'No valid API keys found.' };
  }

  if (currentChatSettings.lockedApiKey) {
    if (availableKeys.includes(currentChatSettings.lockedApiKey)) {
      logUsage(currentChatSettings.lockedApiKey);
      return { key: currentChatSettings.lockedApiKey, isNewKey: false };
    }
    logService.warn('Locked key not found in current configuration. Falling back to rotation.');
  }

  if (availableKeys.length === 1) {
    const key = availableKeys[0];
    logUsage(key);
    const isNewKey = currentChatSettings.lockedApiKey !== key;
    return { key, isNewKey };
  }

  let lastUsedIndex = -1;
  try {
    const storedIndex = localStorage.getItem(API_KEY_LAST_USED_INDEX_KEY);
    if (storedIndex !== null) {
      lastUsedIndex = parseInt(storedIndex, 10);
    }
  } catch (e) {
    logService.error('Could not parse last used API key index', e);
  }

  if (isNaN(lastUsedIndex) || lastUsedIndex < 0 || lastUsedIndex >= availableKeys.length) {
    lastUsedIndex = -1;
  }

  let targetIndex: number;

  if (skipIncrement) {
    targetIndex = lastUsedIndex === -1 ? 0 : lastUsedIndex;
  } else {
    targetIndex = (lastUsedIndex + 1) % availableKeys.length;
    try {
      localStorage.setItem(API_KEY_LAST_USED_INDEX_KEY, targetIndex.toString());
    } catch (e) {
      logService.error('Could not save last used API key index', e);
    }
  }

  const nextKey = availableKeys[targetIndex];
  logUsage(nextKey);
  return { key: nextKey, isNewKey: true };
};

export const getApiKeyErrorTranslationKey = (error: string): string | null => {
  switch (error) {
    case 'API Key not configured.':
      return 'apiRuntime_keyNotConfigured';
    case 'No valid API keys found.':
      return 'apiRuntime_noValidKeysFound';
    default:
      return null;
  }
};
