import type { ChatMessage, SavedChatSession, UploadedFile } from '../../types';

type MessagePatchOrUpdater = Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage);
type FilePatchOrUpdater = Partial<UploadedFile> | ((file: UploadedFile) => UploadedFile);

export const updateSessionById = (
  sessions: SavedChatSession[],
  sessionId: string,
  updater: (session: SavedChatSession) => SavedChatSession,
) => sessions.map((session) => (session.id === sessionId ? updater(session) : session));

export const updateMessageInSession = (
  sessions: SavedChatSession[],
  sessionId: string,
  messageId: string,
  updater: MessagePatchOrUpdater,
) =>
  updateSessionById(sessions, sessionId, (session) => ({
    ...session,
    messages: session.messages.map((message) => {
      if (message.id !== messageId) {
        return message;
      }

      return typeof updater === 'function' ? updater(message) : { ...message, ...updater };
    }),
  }));

export const updateFileInMessage = (
  sessions: SavedChatSession[],
  sessionId: string,
  messageId: string,
  fileId: string,
  updater: FilePatchOrUpdater,
) =>
  updateMessageInSession(sessions, sessionId, messageId, (message) =>
    message.files
      ? {
          ...message,
          files: message.files.map((file) => {
            if (file.id !== fileId) {
              return file;
            }

            return typeof updater === 'function' ? updater(file) : { ...file, ...updater };
          }),
        }
      : message,
  );

export const insertMessageAfter = (
  sessions: SavedChatSession[],
  sessionId: string,
  sourceMessageId: string,
  message: ChatMessage,
) =>
  updateSessionById(sessions, sessionId, (session) => {
    const sourceIndex = session.messages.findIndex((candidate) => candidate.id === sourceMessageId);
    const insertIndex = sourceIndex !== -1 ? sourceIndex + 1 : session.messages.length;
    const messages = [...session.messages];
    messages.splice(insertIndex, 0, message);

    return {
      ...session,
      messages,
    };
  });
