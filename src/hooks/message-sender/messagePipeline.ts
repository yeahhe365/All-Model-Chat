import type { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { generateUniqueId } from '../../utils/chat/ids';
import { createMessage, generateSessionTitle, performOptimisticSessionUpdate } from '../../utils/chat/session';
import { createLoadingModelMessage } from './useMessageLifecycle';
import type { SessionsUpdater } from './types';

interface StartOptimisticMessageTurnParams {
  activeSessionId: string | null;
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: (id: string | null) => void;
  text: string;
  files?: UploadedFile[];
  generationId: string;
  generationStartTime?: Date;
  editingMessageId?: string | null;
  shouldGenerateTitle?: boolean;
  shouldLockKey?: boolean;
  keyToLock?: string;
  createSessionId?: () => string;
}

interface StartedOptimisticMessageTurn {
  finalSessionId: string;
  modelMessageId: string;
  userMessage: ChatMessage;
  modelMessage: ChatMessage;
  generationStartTime: Date;
}

export const startOptimisticMessageTurn = ({
  activeSessionId,
  appSettings,
  currentChatSettings,
  updateAndPersistSessions,
  setActiveSessionId,
  text,
  files,
  generationId,
  generationStartTime = new Date(),
  editingMessageId = null,
  shouldGenerateTitle = !activeSessionId,
  shouldLockKey,
  keyToLock,
  createSessionId = generateUniqueId,
}: StartOptimisticMessageTurnParams): StartedOptimisticMessageTurn => {
  const finalSessionId = activeSessionId || createSessionId();
  const userMessage = createMessage('user', text, files ? { files } : undefined);
  const modelMessage = createLoadingModelMessage({
    id: generationId,
    generationStartTime,
  });
  const title = shouldGenerateTitle ? generateSessionTitle([userMessage, modelMessage]) : undefined;

  updateAndPersistSessions((prev) =>
    performOptimisticSessionUpdate(prev, {
      activeSessionId,
      newSessionId: finalSessionId,
      newMessages: [userMessage, modelMessage],
      settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings },
      editingMessageId,
      title,
      shouldLockKey,
      keyToLock,
    }),
  );

  if (!activeSessionId) {
    setActiveSessionId(finalSessionId);
  }

  return {
    finalSessionId,
    modelMessageId: generationId,
    userMessage,
    modelMessage,
    generationStartTime,
  };
};
