import type {
  AppSettings,
  ChatMessage,
  ChatSettings as IndividualChatSettings,
  SavedChatSession,
  UploadedFile,
} from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { generateUniqueId } from '../../utils/chat/ids';
import { createMessage, generateSessionTitle, performOptimisticSessionUpdate } from '../../utils/chat/session';
import { updateMessageInSession } from '../../utils/chat/sessionMutations';
import { playCompletionSound, showNotification } from '../../utils/uiUtils';
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

interface CompleteModelMessageParams {
  sessionId: string;
  messageId: string;
  patch: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage);
}

type MessageLifecycleRunner = <T>(params: {
  sessionId: string;
  generationId: string;
  abortController: AbortController;
  modelMessageId?: string;
  errorPrefix?: string;
  execute: () => Promise<T>;
  onError?: (error: unknown) => void;
}) => Promise<T | undefined>;

interface CompletionNotification {
  title: string;
  body: string;
}

interface CompletionFeedback {
  sound?: boolean;
  notification?: CompletionNotification;
}

interface OptimisticPipelineResult {
  patch: CompleteModelMessageParams['patch'];
  feedback?: CompletionFeedback;
}

interface RunOptimisticMessagePipelineParams extends Omit<StartOptimisticMessageTurnParams, 'generationStartTime'> {
  generationStartTime?: Date;
  abortController: AbortController;
  errorPrefix: string;
  runMessageLifecycle: MessageLifecycleRunner;
  execute: (turn: StartedOptimisticMessageTurn) => Promise<OptimisticPipelineResult>;
}

export const completeModelMessage = (
  sessions: SavedChatSession[],
  { sessionId, messageId, patch }: CompleteModelMessageParams,
) => updateMessageInSession(sessions, sessionId, messageId, patch);

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

const emitCompletionFeedback = async (appSettings: AppSettings, feedback: CompletionFeedback = {}) => {
  if (feedback.sound !== false && appSettings.isCompletionSoundEnabled) {
    playCompletionSound();
  }

  if (
    feedback.notification &&
    appSettings.isCompletionNotificationEnabled &&
    typeof document !== 'undefined' &&
    document.hidden
  ) {
    const { APP_LOGO_SVG_DATA_URI } = await import('../../constants/assets');
    showNotification(feedback.notification.title, {
      body: feedback.notification.body,
      icon: APP_LOGO_SVG_DATA_URI,
    });
  }
};

export const runOptimisticMessagePipeline = async ({
  abortController,
  errorPrefix,
  runMessageLifecycle,
  execute,
  ...turnParams
}: RunOptimisticMessagePipelineParams) => {
  const turn = startOptimisticMessageTurn(turnParams);

  await runMessageLifecycle({
    sessionId: turn.finalSessionId,
    generationId: turnParams.generationId,
    abortController,
    modelMessageId: turn.modelMessageId,
    errorPrefix,
    execute: async () => {
      const result = await execute(turn);

      turnParams.updateAndPersistSessions((prev) =>
        completeModelMessage(prev, {
          sessionId: turn.finalSessionId,
          messageId: turn.modelMessageId,
          patch: result.patch,
        }),
      );

      await emitCompletionFeedback(turnParams.appSettings, result.feedback);
      return result;
    },
  });

  return turn;
};
