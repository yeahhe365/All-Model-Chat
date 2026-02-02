
import { ChatMessage, SavedChatSession, ChatSettings } from '../../types';
import { generateUniqueId } from './ids';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { logService } from '../../services/logService';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';

export const createMessage = (
    role: 'user' | 'model' | 'error',
    content: string,
    options: Partial<Exclude<ChatMessage, 'id' | 'role' | 'content' | 'timestamp'>> & { id?: string; timestamp?: Date } = {}
): ChatMessage => ({
    id: options.id || generateUniqueId(),
    role,
    content,
    timestamp: options.timestamp || new Date(),
    ...options
});

export const createNewSession = (
    settings: ChatSettings,
    messages: ChatMessage[] = [],
    title: string = "New Chat",
    groupId: string | null = null
): SavedChatSession => ({
    id: generateUniqueId(),
    title,
    messages,
    settings,
    timestamp: Date.now(),
    groupId,
});

export const generateSessionTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.content.trim() !== '');
    if (firstUserMessage) {
      return firstUserMessage.content.split(/\s+/).slice(0, 7).join(' ') + (firstUserMessage.content.split(/\s+/).length > 7 ? '...' : '');
    }
    const firstModelMessage = messages.find(msg => msg.role === 'model' && msg.content.trim() !== '');
     if (firstModelMessage) {
      return "Model: " + firstModelMessage.content.split(/\s+/).slice(0, 5).join(' ') + (firstModelMessage.content.split(/\s+/).length > 5 ? '...' : '');
    }
    const firstFile = messages.find(msg => msg.files && msg.files.length > 0)?.files?.[0];
    if (firstFile) {
        return `Chat with ${firstFile.name}`;
    }
    return 'New Chat';
};

export const rehydrateSessionFiles = (session: SavedChatSession): SavedChatSession => {
    const newMessages = session.messages.map(message => {
        if (!message.files?.length) return message;

        const newFiles = message.files.map(file => {
            // Check if it's an image that was stored locally (has rawFile)
            // Fix for Issue #21: Ensure rawFile is a valid Blob/File before using it.
            // JSON import may produce plain objects {} for rawFile which causes crashes.
            const isValidRawFile = file.rawFile && (file.rawFile instanceof Blob || file.rawFile instanceof File);

            if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
                if (isValidRawFile) {
                    try {
                        // Create a new blob URL. The browser will handle the old invalid one on page unload.
                        const dataUrl = URL.createObjectURL(file.rawFile as Blob);
                        return { ...file, dataUrl: dataUrl };
                    } catch (error) {
                        logService.error("Failed to create object URL for file on load", { fileId: file.id, error });
                        // Keep the file but mark that preview failed
                        return { ...file, dataUrl: undefined, error: "Preview failed to load" };
                    }
                } else if (file.rawFile) {
                    // It has a rawFile property but it's not a Blob (e.g. {} from JSON). Strip it.
                    // This prevents re-using invalid file objects.
                    const { rawFile, ...rest } = file;
                    return rest;
                }
            }
            return file;
        });

        return { ...message, files: newFiles };
    });

    return { ...session, messages: newMessages };
};

/**
 * Prepares a session object for export by stripping out non-serializable properties
 * like Blobs, Files, and ephemeral URL references.
 */
export const sanitizeSessionForExport = (session: SavedChatSession): SavedChatSession => {
    return {
        ...session,
        messages: session.messages.map(msg => {
            if (!msg.files) return msg;
            return {
                ...msg,
                files: msg.files.map(f => {
                    // Create a shallow copy to avoid mutating the original
                    const fileCopy = { ...f };
                    
                    // Remove non-serializable or local-only properties
                    // rawFile cannot be serialized to JSON and causes {} artifacts if attempted
                    delete fileCopy.rawFile;
                    delete fileCopy.abortController;
                    
                    // Remove blob URLs as they are not persistent across sessions/devices
                    if (fileCopy.dataUrl && fileCopy.dataUrl.startsWith('blob:')) {
                        delete fileCopy.dataUrl;
                    }
                    return fileCopy;
                })
            };
        })
    };
};

/**
 * Core helper to update session list state.
 * Handles:
 * 1. Finding or creating session
 * 2. Rewinding history if editing
 * 3. Appending new messages
 * 4. Updating settings/title/keys
 */
export const performOptimisticSessionUpdate = (
    prevSessions: SavedChatSession[],
    params: {
        activeSessionId: string | null;
        newSessionId: string; // The ID to use if creating a new session or identifying the active one
        newMessages: ChatMessage[];
        settings: ChatSettings;
        editingMessageId?: string | null;
        appSettings: any; // Passed to access defaults for new sessions
        title?: string;
        shouldLockKey?: boolean;
        keyToLock?: string;
    }
): SavedChatSession[] => {
    const { 
        activeSessionId, newSessionId, newMessages, settings, 
        editingMessageId, appSettings, title, shouldLockKey, keyToLock 
    } = params;

    const existingSessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);

    // --- Case 1: Create New Session ---
    if (existingSessionIndex === -1) {
        const newSettings = { ...settings };
        if (shouldLockKey && keyToLock) {
            newSettings.lockedApiKey = keyToLock;
        }

        const newSession = createNewSession(
            newSettings, 
            newMessages, 
            title || "New Chat"
        );
        newSession.id = newSessionId; // Ensure ID matches what caller expects

        return [newSession, ...prevSessions];
    }

    // --- Case 2: Update Existing Session ---
    const updatedSessions = [...prevSessions];
    const session = updatedSessions[existingSessionIndex];
    let finalMessages = [...session.messages];

    // Handle Edit/Rewind
    if (editingMessageId) {
        const editIndex = finalMessages.findIndex(m => m.id === editingMessageId);
        if (editIndex !== -1) {
            finalMessages = finalMessages.slice(0, editIndex);
        }
    }

    // Append new messages
    // Note: If newMessages contains the modified user message + new model message, just append them
    // Logic: If we rewound, we usually push the "new version" of the user message + model message.
    finalMessages = [...finalMessages, ...newMessages];

    // Handle Settings Update (Key Locking)
    let updatedSettings = session.settings;
    // We might want to merge latest settings from params if they changed, 
    // but typically we preserve session settings unless explicitly locking a key.
    // However, for consistency, let's respect the settings passed in which usually merge appSettings + currentChatSettings
    updatedSettings = { ...updatedSettings, ...settings };
    
    if (shouldLockKey && !session.settings.lockedApiKey && keyToLock) {
        updatedSettings.lockedApiKey = keyToLock;
    }

    updatedSessions[existingSessionIndex] = {
        ...session,
        messages: finalMessages,
        title: title || session.title,
        settings: updatedSettings,
        // Update timestamp if new messages are added to bump it to the top
        timestamp: newMessages.length > 0 ? Date.now() : session.timestamp
    };

    return updatedSessions;
};

/**
 * Legacy Helper - retained for backward compatibility if needed, 
 * but performOptimisticSessionUpdate is preferred for message sending flow.
 */
export const updateSessionWithNewMessages = (
    prevSessions: SavedChatSession[],
    sessionId: string,
    newMessages: ChatMessage[],
    settings: ChatSettings,
    options: {
        title?: string;
        shouldLockKey?: boolean;
        keyToLock?: string;
    } = {}
): SavedChatSession[] => {
    // Delegates to the new robust handler
    return performOptimisticSessionUpdate(prevSessions, {
        activeSessionId: sessionId, // Assume sessionId passed is the active one
        newSessionId: sessionId,
        newMessages: [], // We are replacing messages entirely in this legacy signature
        settings,
        appSettings: {}, // Legacy fallback
        title: options.title,
        shouldLockKey: options.shouldLockKey,
        keyToLock: options.keyToLock
    }).map(s => {
        // Fixup: The legacy function replaced messages entirely, the new one appends.
        // We override the messages here to match legacy behavior strictly.
        if (s.id === sessionId) {
            return { ...s, messages: newMessages, timestamp: Date.now() };
        }
        return s;
    });
};
