import { AppSettings, ChatSettings, SavedChatSession } from '../../types';

/**
 * Keep session-level settings free of raw provider secrets before persistence/export.
 */
export const sanitizeChatSettingsForStorage = (settings: ChatSettings): ChatSettings => ({
    ...settings,
    lockedApiKey: null,
});

/**
 * Keep app-level settings free of raw provider secrets before persistence/export.
 */
export const sanitizeAppSettingsForStorage = (settings: AppSettings): AppSettings => ({
    ...settings,
    apiKey: null,
    lockedApiKey: null,
});

/**
 * Keep stored/exported session payloads free of raw provider secrets.
 */
export const sanitizeSessionForStorage = (session: SavedChatSession): SavedChatSession => ({
    ...session,
    settings: sanitizeChatSettingsForStorage(session.settings),
});
