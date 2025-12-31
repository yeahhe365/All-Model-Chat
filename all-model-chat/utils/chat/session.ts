
import { ChatMessage, SavedChatSession, ChatSettings } from '../../types';
import { generateUniqueId } from './ids';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { logService } from '../../services/logService';

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
