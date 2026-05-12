import {
  type ChatMessage,
  type SavedChatSession,
  type ChatSettings,
  type PersistedSessionFileRecord,
  type UploadedFile,
} from '@/types';
import { generateUniqueId } from './ids';
import { base64ToBlob, blobToBase64 } from '@/utils/fileHelpers';
import { getVisibleChatMessages } from './visibility';
import { createManagedObjectUrl, releaseManagedObjectUrlsByOwner } from '@/services/objectUrlManager';

const logSessionWarning = (message: string, data?: unknown) => {
  console.warn(`[session] ${message}`, data);
};

const logSessionError = (message: string, data?: unknown) => {
  console.error(`[session] ${message}`, data);
};

export const createMessage = (
  role: 'user' | 'model' | 'error',
  content: string,
  options: Partial<Exclude<ChatMessage, 'id' | 'role' | 'content' | 'timestamp'>> & {
    id?: string;
    timestamp?: Date;
  } = {},
): ChatMessage => ({
  id: options.id || generateUniqueId(),
  role,
  content,
  timestamp: options.timestamp || new Date(),
  ...options,
});

export const createNewSession = (
  settings: ChatSettings,
  messages: ChatMessage[] = [],
  title: string = 'New Chat',
  groupId: string | null = null,
): SavedChatSession => ({
  id: generateUniqueId(),
  title,
  messages,
  settings,
  timestamp: Date.now(),
  groupId,
});

export const generateSessionTitle = (messages: ChatMessage[]): string => {
  const visibleMessages = getVisibleChatMessages(messages);
  const firstUserMessage = visibleMessages.find((msg) => msg.role === 'user' && msg.content.trim() !== '');
  if (firstUserMessage) {
    return (
      firstUserMessage.content.split(/\s+/).slice(0, 7).join(' ') +
      (firstUserMessage.content.split(/\s+/).length > 7 ? '...' : '')
    );
  }
  const firstModelMessage = visibleMessages.find((msg) => msg.role === 'model' && msg.content.trim() !== '');
  if (firstModelMessage) {
    return (
      'Model: ' +
      firstModelMessage.content.split(/\s+/).slice(0, 5).join(' ') +
      (firstModelMessage.content.split(/\s+/).length > 5 ? '...' : '')
    );
  }
  const firstFile = visibleMessages.find((msg) => msg.files && msg.files.length > 0)?.files?.[0];
  if (firstFile) {
    return `Chat with ${firstFile.name}`;
  }
  return 'New Chat';
};

export const rehydrateSessionFiles = (session: SavedChatSession): SavedChatSession => {
  const sessionResourceOwner = `session:${session.id}`;
  releaseManagedObjectUrlsByOwner(sessionResourceOwner);

  const newMessages = session.messages.map((message) => {
    if (!message.files?.length) return message;

    const newFiles = message.files.map((file) => {
      // 1. Check for legacy Base64 stored in dataUrl (Abuse Check)
      // If dataUrl exists but it's NOT a blob: URI, it might be a base64 string
      if (file.dataUrl && !file.dataUrl.startsWith('blob:') && !file.dataUrl.startsWith('http')) {
        // It's likely a base64 string. Convert to Blob to save memory/performance.
        try {
          // Strip prefix if present (data:image/png;base64,...)
          const base64Clean = file.dataUrl.includes(',') ? file.dataUrl.split(',')[1] : file.dataUrl;
          const blob = base64ToBlob(base64Clean, file.type);
          const newFile = new File([blob], file.name, { type: file.type });
          const newUrl = createManagedObjectUrl(newFile, {
            key: `session-file:${session.id}:${message.id}:${file.id}`,
            ownerId: sessionResourceOwner,
          });

          return { ...file, rawFile: newFile, dataUrl: newUrl };
        } catch {
          logSessionWarning(`Failed to migrate legacy Base64 file: ${file.name}`);
          // If migration fails, keep as is, but it might lag
        }
      }

      // 2. Standard Rehydration from IndexedDB Blob (rawFile)
      const isValidRawFile = file.rawFile instanceof Blob;

      // Always create Object URL for Blobs if we have the raw file, needed for previewing (text, images, media, etc.)
      // Previously this logic was restricted to visual media/PDFs, causing text files to have stale/invalid dataUrls on reload.
      if (isValidRawFile) {
        try {
          // Create a new blob URL. The browser will handle the old invalid one on page unload.
          const dataUrl = createManagedObjectUrl(file.rawFile as Blob, {
            key: `session-file:${session.id}:${message.id}:${file.id}`,
            ownerId: sessionResourceOwner,
          });
          return { ...file, dataUrl: dataUrl };
        } catch (error) {
          logSessionError('Failed to create object URL for file on load', { fileId: file.id, error });
          return { ...file, dataUrl: undefined, error: 'Preview failed to load' };
        }
      } else if (file.rawFile && !isValidRawFile) {
        // It has a rawFile property but it's not a Blob (e.g. {} from JSON or bad persistence). Strip it.
        const fileWithoutRaw = { ...file };
        delete fileWithoutRaw.rawFile;
        return fileWithoutRaw;
      }

      return file;
    });

    return { ...message, files: newFiles };
  });

  return { ...session, messages: newMessages };
};

const hasInlinePersistableDataUrl = (dataUrl?: string) =>
  !!dataUrl && !dataUrl.startsWith('blob:') && !dataUrl.startsWith('http');

const sanitizeStoredFileMetadata = (file: UploadedFile): UploadedFile => {
  const fileCopy = { ...file };
  delete fileCopy.rawFile;
  delete fileCopy.abortController;

  if (fileCopy.dataUrl && (fileCopy.dataUrl.startsWith('blob:') || hasInlinePersistableDataUrl(fileCopy.dataUrl))) {
    delete fileCopy.dataUrl;
  }

  return fileCopy;
};

export const extractPersistedSessionFileRecords = (session: SavedChatSession): PersistedSessionFileRecord[] => {
  const records: PersistedSessionFileRecord[] = [];

  session.messages.forEach((message) => {
    message.files?.forEach((file) => {
      let rawFile: Blob | undefined;

      if (file.rawFile instanceof Blob) {
        rawFile = file.rawFile;
      } else if (hasInlinePersistableDataUrl(file.dataUrl)) {
        try {
          const base64Clean = file.dataUrl!.includes(',') ? file.dataUrl!.split(',')[1] : file.dataUrl!;
          rawFile = base64ToBlob(base64Clean, file.type);
        } catch (error) {
          logSessionWarning(`Failed to extract inline file payload for persistence: ${file.name}`, { error });
        }
      }

      if (!rawFile) {
        return;
      }

      records.push({
        id: file.id,
        sessionId: session.id,
        messageId: message.id,
        name: file.name,
        type: file.type,
        rawFile,
      });
    });
  });

  return records;
};

export const stripSessionFilePayloads = (session: SavedChatSession): SavedChatSession => ({
  ...session,
  messages: session.messages.map((message) => {
    if (!message.files) {
      return message;
    }

    return {
      ...message,
      files: message.files.map(sanitizeStoredFileMetadata),
    };
  }),
});

export const attachPersistedSessionFiles = (
  session: SavedChatSession,
  fileRecords: Map<string, PersistedSessionFileRecord>,
): SavedChatSession => ({
  ...session,
  messages: session.messages.map((message) => {
    if (!message.files) {
      return message;
    }

    return {
      ...message,
      files: message.files.map((file) => {
        const record = fileRecords.get(file.id);
        if (!record) {
          return file;
        }

        return {
          ...file,
          rawFile: record.rawFile,
        };
      }),
    };
  }),
});

const buildPortableDataUrl = async (file: UploadedFile): Promise<string | undefined> => {
  if (file.rawFile instanceof Blob) {
    const mimeType = file.type || file.rawFile.type || 'application/octet-stream';
    const base64 = await blobToBase64(file.rawFile);
    return `data:${mimeType};base64,${base64}`;
  }

  if (hasInlinePersistableDataUrl(file.dataUrl)) {
    return file.dataUrl;
  }

  return undefined;
};

const serializeFileForPortableExport = async (file: UploadedFile): Promise<UploadedFile> => {
  const dataUrl = await buildPortableDataUrl(file);
  const fileCopy = sanitizeStoredFileMetadata(file);

  if (dataUrl) {
    fileCopy.dataUrl = dataUrl;
  }

  return fileCopy;
};

export const serializeSessionForPortableExport = async (session: SavedChatSession): Promise<SavedChatSession> => ({
  ...session,
  messages: await Promise.all(session.messages.map(serializeMessageForPortableExport)),
});

export const serializeMessageForPortableExport = async (message: ChatMessage): Promise<ChatMessage> => ({
  ...message,
  files: message.files ? await Promise.all(message.files.map(serializeFileForPortableExport)) : undefined,
});

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
    title?: string;
    shouldLockKey?: boolean;
    keyToLock?: string;
  },
): SavedChatSession[] => {
  const { activeSessionId, newSessionId, newMessages, settings, editingMessageId, title, shouldLockKey, keyToLock } =
    params;

  const existingSessionIndex = prevSessions.findIndex((s) => s.id === activeSessionId);

  // --- Case 1: Create New Session ---
  if (existingSessionIndex === -1) {
    const newSettings = { ...settings };
    if (shouldLockKey && keyToLock) {
      newSettings.lockedApiKey = keyToLock;
    }

    const newSession = createNewSession(newSettings, newMessages, title || 'New Chat');
    newSession.id = newSessionId; // Ensure ID matches what caller expects

    return [newSession, ...prevSessions];
  }

  // --- Case 2: Update Existing Session ---
  const updatedSessions = [...prevSessions];
  const session = updatedSessions[existingSessionIndex];
  let finalMessages = [...session.messages];

  // Handle Edit/Rewind
  if (editingMessageId) {
    const editIndex = finalMessages.findIndex((m) => m.id === editingMessageId);
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
    timestamp: newMessages.length > 0 ? Date.now() : session.timestamp,
  };

  return updatedSessions;
};
