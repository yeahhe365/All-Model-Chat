import { useCallback } from 'react';
import type { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { createMessage, generateSessionTitle, performOptimisticSessionUpdate } from '../../utils/chat/session';
import type { SessionsUpdater } from './types';
import { createLoadingModelMessage } from './useMessageLifecycle';

interface UseStandardChatSessionParams {
  appSettings: AppSettings;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  setEditingMessageId: (id: string | null) => void;
  updateAndPersistSessions: SessionsUpdater;
  sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
}

interface UpdateSessionStateParams {
  finalSessionId: string;
  textToUse: string;
  enrichedFiles: UploadedFile[];
  effectiveEditingId: string | null;
  generationId: string;
  generationStartTime: Date;
  isContinueMode: boolean;
  isRawMode: boolean;
  sessionToUpdate: IndividualChatSettings;
  keyToUse: string;
  shouldLockKey: boolean;
}

export const useStandardChatSession = ({
  appSettings,
  activeSessionId,
  setActiveSessionId,
  setEditingMessageId,
  updateAndPersistSessions,
  sessionKeyMapRef,
}: UseStandardChatSessionParams) => {
  const updateSessionState = useCallback(
    ({
      finalSessionId,
      textToUse,
      enrichedFiles,
      effectiveEditingId,
      generationId,
      generationStartTime,
      isContinueMode,
      isRawMode,
      sessionToUpdate,
      keyToUse,
      shouldLockKey,
    }: UpdateSessionStateParams) => {
      updateAndPersistSessions((prev) => {
        if (isContinueMode) {
          return prev.map((session) => {
            if (session.id !== finalSessionId) {
              return session;
            }

            return {
              ...session,
              messages: session.messages.map((message) =>
                message.id === effectiveEditingId
                  ? {
                      ...message,
                      isLoading: true,
                      generationEndTime: undefined,
                      stoppedByUser: false,
                    }
                  : message,
              ),
            };
          });
        }

        const existingSession = prev.find((session) => session.id === activeSessionId);
        let cumulativeTotalTokens = 0;
        if (existingSession && existingSession.messages.length > 0) {
          const lastMessage = existingSession.messages[existingSession.messages.length - 1];
          cumulativeTotalTokens = lastMessage.cumulativeTotalTokens || 0;
        }

        const userMessage = createMessage('user', textToUse.trim(), {
          files: enrichedFiles.length ? enrichedFiles : undefined,
          cumulativeTotalTokens: cumulativeTotalTokens > 0 ? cumulativeTotalTokens : undefined,
        });

        const modelMessage = createLoadingModelMessage({
          id: generationId,
          content: isRawMode ? '<thinking>' : '',
          generationStartTime,
        });

        let newTitle: string | undefined;
        if (!activeSessionId || existingSession?.title === 'New Chat') {
          newTitle = generateSessionTitle([userMessage, modelMessage]);
        }

        return performOptimisticSessionUpdate(prev, {
          activeSessionId,
          newSessionId: finalSessionId,
          newMessages: [userMessage, modelMessage],
          settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...sessionToUpdate },
          editingMessageId: effectiveEditingId,
          title: newTitle,
          shouldLockKey,
          keyToLock: keyToUse,
        });
      });

      if (!activeSessionId) {
        setActiveSessionId(finalSessionId);
      }

      sessionKeyMapRef.current.set(finalSessionId, keyToUse);

      if (effectiveEditingId) {
        setEditingMessageId(null);
      }
    },
    [activeSessionId, appSettings, sessionKeyMapRef, setActiveSessionId, setEditingMessageId, updateAndPersistSessions],
  );

  return { updateSessionState };
};
