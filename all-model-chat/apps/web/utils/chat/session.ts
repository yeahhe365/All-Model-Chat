

import { ChatMessage, SavedChatSession, ChatSettings } from '../../types';
import { generateUniqueId } from './ids';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { logService } from '../../services/logService';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { base64ToBlob } from '../fileHelpers';

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
            // 1. Check for legacy Base64 stored in dataUrl (Abuse Check)
            // If dataUrl exists but it's NOT a blob: URI, it might be a base64 string
            if (file.dataUrl && !file.dataUrl.startsWith('blob:') && !file.dataUrl.startsWith('http')) {
                // It's likely a base64 string. Convert to Blob to save memory/performance.
                try {
                    // Strip prefix if present (data:image/png;base64,...)
                    const base64Clean = file.dataUrl.includes(',') ? file.dataUrl.split(',')[1] : file.dataUrl;
                    const blob = base64ToBlob(base64Clean, file.type);
                    const newFile = new File([blob], file.name, { type: file.type });
                    const newUrl = URL.createObjectURL(newFile);
                    
                    return { ...file, rawFile: newFile, dataUrl: newUrl };
                } catch (e) {
                    logService.warn(`Failed to migrate legacy Base64 file: ${file.name}`);
                    // If migration fails, keep as is, but it might lag
                }
            }

            // 2. Standard Rehydration from IndexedDB Blob (rawFile)
            const isValidRawFile = file.rawFile && (file.rawFile instanceof Blob || file.rawFile instanceof File);
            const isVisualMedia = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || file.type.startsWith('video/') || file.type.startsWith('audio/');

            // Always create Object URL for Blobs if we have the raw file, needed for previewing
            if (isValidRawFile && (isVisualMedia || file.type === 'application/pdf')) {
                try {
                    // Create a new blob URL. The browser will handle the old invalid one on page unload.
                    const dataUrl = URL.createObjectURL(file.rawFile as Blob);
                    return { ...file, dataUrl: dataUrl };
                } catch (error) {
                    logService.error("Failed to create object URL for file on load", { fileId: file.id, error });
                    return { ...file, dataUrl: undefined, error: "Preview failed to load" };
                }
            } else if (file.rawFile && !isValidRawFile) {
                // It has a rawFile property but it's not a Blob (e.g. {} from JSON or bad persistence). Strip it.
                const { rawFile, ...rest } = file;
                return rest;
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
    finalMessages = [...finalMessages, ...newMessages];

    // Handle Settings Update (Key Locking)
    let updatedSettings = session.settings;
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