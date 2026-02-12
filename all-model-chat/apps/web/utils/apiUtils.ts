
import { AppSettings, ChatSettings } from '../types';
import { API_KEY_LAST_USED_INDEX_KEY } from '../constants/appConstants';
import { logService } from '../services/logService';

export const BACKEND_MANAGED_KEY_SENTINEL = '__BFF_BACKEND_MANAGED_KEY__';

export const getActiveApiConfig = (appSettings: AppSettings): { apiKeysString: string | null } => {
    if (appSettings.useCustomApiConfig) {
        return {
            apiKeysString: appSettings.apiKey,
        };
    }
    return {
        // Backend-managed mode: key material lives on BFF. Keep a sentinel so callers can proceed.
        apiKeysString: BACKEND_MANAGED_KEY_SENTINEL,
    };
};

/**
 * Parses a raw API key string (which may contain multiple keys, newlines, commas, or quotes)
 * into a clean array of individual keys.
 */
export const parseApiKeys = (apiKeysString: string | null): string[] => {
    if (!apiKeysString) return [];
    return apiKeysString
        .split(/[\n,]+/)
        .map(k => k.trim().replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 0);
};

export const getKeyForRequest = (
    appSettings: AppSettings,
    currentChatSettings: ChatSettings,
    options: { skipIncrement?: boolean } = {}
): { key: string; isNewKey: boolean } | { error: string } => {
    const { skipIncrement = false } = options;

    const { apiKeysString } = getActiveApiConfig(appSettings);
    if (!apiKeysString) {
        return { error: "API Key not configured." };
    }
    
    const availableKeys = parseApiKeys(apiKeysString);

    if (availableKeys.length === 0) {
        return { error: "No valid API keys found." };
    }

    // 1. Locked Key Validation
    if (currentChatSettings.lockedApiKey) {
        // If we are using custom config, we must validate the locked key exists in the current pool.
        // If the user deleted the key from settings, we shouldn't use it (unless it's environment provided).
        // For environment keys, we assume they are valid if availableKeys contains them or if we just trust the lock.
        // Here we check if the locked key is in the available list.
        if (availableKeys.includes(currentChatSettings.lockedApiKey)) {
            return { key: currentChatSettings.lockedApiKey, isNewKey: false };
        } else {
            logService.warn(`Locked key not found in current configuration. Falling back to rotation.`);
            // Fall through to rotation logic
        }
    }

    if (availableKeys.length === 1) {
        const key = availableKeys[0];
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
    
    // If we are here, we are providing a rotated key. 
    // If there was a locked key that was invalid, this is definitely a new key.
    // If there was no locked key, it's also effectively a "new" key selection strategy.
    return { key: nextKey, isNewKey: true };
};
