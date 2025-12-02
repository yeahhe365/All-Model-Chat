
import { AppSettings, ChatSettings } from '../types';
import { API_KEY_LAST_USED_INDEX_KEY } from '../constants/appConstants';
import { logService } from '../services/logService';

export const getActiveApiConfig = (appSettings: AppSettings): { apiKeysString: string | null; baseUrl?: string } => {
    let apiKeysString = process.env.API_KEY || null;
    let baseUrl: string | undefined = undefined;

    if (appSettings.useCustomApiConfig) {
        apiKeysString = appSettings.apiKey;
        if (appSettings.useApiProxy && appSettings.apiProxyUrl) {
            baseUrl = appSettings.apiProxyUrl;
        }
    }
    
    return {
        apiKeysString,
        baseUrl
    };
};

export const getKeyForRequest = (
    appSettings: AppSettings,
    currentChatSettings: ChatSettings,
    options: { skipIncrement?: boolean } = {}
): { key: string; isNewKey: boolean } | { error: string } => {
    const { skipIncrement = false } = options;

    const logUsage = (key: string) => {
        if (appSettings.useCustomApiConfig) {
            logService.recordApiKeyUsage(key);
        }
    };

    const { apiKeysString } = getActiveApiConfig(appSettings);
    if (!apiKeysString) {
        return { error: "API Key not configured." };
    }
    
    // Robust parsing: split by newline or comma, trim, remove quotes, filter empty
    const availableKeys = apiKeysString
        .split(/[\n,]+/)
        .map(k => k.trim().replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 0);

    if (availableKeys.length === 0) {
        return { error: "No valid API keys found." };
    }

    // 1. Locked Key Validation
    if (currentChatSettings.lockedApiKey) {
        // If we are using custom config, we must validate the locked key exists in the current pool.
        if (availableKeys.includes(currentChatSettings.lockedApiKey)) {
            logUsage(currentChatSettings.lockedApiKey);
            return { key: currentChatSettings.lockedApiKey, isNewKey: false };
        } else {
            logService.warn(`Locked key not found in current configuration. Falling back to rotation.`);
            // Fall through to rotation logic
        }
    }

    if (availableKeys.length === 1) {
        const key = availableKeys[0];
        logUsage(key);
        // If we fell through from an invalid locked key, isNewKey should be true to update the session
        const isNewKey = currentChatSettings.lockedApiKey !== key;
        return { key, isNewKey };
    }

    // Round-robin logic
    let lastUsedIndex = -1;
    try {
        const storedIndex = localStorage.getItem(API_KEY_LAST_USED_INDEX_KEY);
        if (storedIndex !== null) {
            lastUsedIndex = parseInt(storedIndex, 10);
        }
    } catch (e) {
        logService.error("Could not parse last used API key index", e);
    }

    // Validate index boundary
    if (isNaN(lastUsedIndex) || lastUsedIndex < 0 || lastUsedIndex >= availableKeys.length) {
        lastUsedIndex = -1;
    }

    let targetIndex: number;

    if (skipIncrement) {
        // Use the last used key (or the first one if none used yet) without advancing
        targetIndex = lastUsedIndex === -1 ? 0 : lastUsedIndex;
    } else {
        // Increment
        targetIndex = (lastUsedIndex + 1) % availableKeys.length;
        try {
            localStorage.setItem(API_KEY_LAST_USED_INDEX_KEY, targetIndex.toString());
        } catch (e) {
            logService.error("Could not save last used API key index", e);
        }
    }

    const nextKey = availableKeys[targetIndex];
    logUsage(nextKey);
    
    // If we are here, we are providing a rotated key. 
    // If there was a locked key that was invalid, this is definitely a new key.
    // If there was no locked key, it's also effectively a "new" key selection strategy.
    return { key: nextKey, isNewKey: true };
};
