import { API_KEY_LAST_USED_INDEX_KEY } from '../../constants/appConstants';
import { AppSettings, SavedChatSession } from '../../types';
import { dbService } from '../db';
import { sanitizeAppSettingsForStorage, sanitizeSessionForStorage } from './sensitiveData';

const LEGACY_API_USAGE_STORAGE_KEY = 'chatApiUsageData';
const MIGRATION_VERSION_STORAGE_KEY = 'allModelChat.securityMigration.version';
const SENSITIVE_DATA_MIGRATION_VERSION = 1;

const hasAppSensitiveValues = (settings: AppSettings): boolean =>
    (typeof settings.apiKey === 'string' && settings.apiKey.trim().length > 0) ||
    (typeof settings.lockedApiKey === 'string' && settings.lockedApiKey.trim().length > 0);

const hasSessionSensitiveValues = (session: SavedChatSession): boolean =>
    typeof session.settings.lockedApiKey === 'string' && session.settings.lockedApiKey.trim().length > 0;

const getStoredMigrationVersion = (): number => {
    try {
        const raw = localStorage.getItem(MIGRATION_VERSION_STORAGE_KEY);
        if (!raw) return 0;
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
};

const setStoredMigrationVersion = (version: number): void => {
    try {
        localStorage.setItem(MIGRATION_VERSION_STORAGE_KEY, String(version));
    } catch {
        // Ignore storage write failures in migration bookkeeping.
    }
};

const clearLegacySensitiveLocalStorage = (): void => {
    try {
        localStorage.removeItem(LEGACY_API_USAGE_STORAGE_KEY);
        localStorage.removeItem(API_KEY_LAST_USED_INDEX_KEY);
    } catch {
        // Ignore storage clear failures.
    }
};

export const runSensitiveDataCleanupMigration = async (): Promise<void> => {
    const version = getStoredMigrationVersion();
    if (version >= SENSITIVE_DATA_MIGRATION_VERSION) {
        return;
    }

    clearLegacySensitiveLocalStorage();

    try {
        const storedSettings = await dbService.getAppSettings();
        if (storedSettings && hasAppSensitiveValues(storedSettings)) {
            await dbService.setAppSettings(sanitizeAppSettingsForStorage(storedSettings));
        }

        const sessions = await dbService.getAllSessions();
        if (sessions.some(hasSessionSensitiveValues)) {
            await dbService.setAllSessions(sessions.map(sanitizeSessionForStorage));
        }
    } catch (error) {
        console.error('Failed to run sensitive-data cleanup migration:', error);
        return;
    }

    setStoredMigrationVersion(SENSITIVE_DATA_MIGRATION_VERSION);
};
