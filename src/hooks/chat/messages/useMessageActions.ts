import { type Dispatch, type SetStateAction } from 'react';
import type React from 'react';
import { useCallback } from 'react';
import { type ChatMessage, type UploadedFile, type SavedChatSession, type InputCommand } from '@/types';
import { logService } from '@/services/logService';
import { CHAT_INPUT_TEXTAREA_SELECTOR } from '@/constants/appConstants';
import { cleanupFilePreviewUrls } from '@/utils/fileHelpers';
import { getVisibleChatMessages } from '@/utils/chat/visibility';
import { cloneMessagesWithFreshIds, createNewSession } from '@/utils/chat/session';
import { updateMessageInSession, updateSessionById } from '@/utils/chat/sessionMutations';
import {
  finishActiveGenerationJob,
  hasActiveGenerationJobForSession,
  holdSessionLoadingForGenerationHandoff,
  releaseSessionLoadingForGenerationHandoff,
  unregisterActiveGenerationJob,
} from '@/features/message-sender/activeGenerationJobs';

type CommandedInputSetter = Dispatch<SetStateAction<InputCommand | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
type ActiveSessionSetter = (id: string | null, options?: { history?: 'push' | 'replace' | 'none' | 'auto' }) => void;
type SendMessageFunc = (overrideOptions?: {
  text?: string;
  files?: UploadedFile[];
  editingId?: string;
  isContinueMode?: boolean;
}) => Promise<void>;

interface MessageActionsProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeSessionId: string | null;
  editingMessageId: string | null;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
  setCommandedInput: CommandedInputSetter;
  setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setEditingMessageId: (id: string | null) => void;
  setEditMode: (mode: 'update' | 'resend') => void;
  setAppFileError: (error: string | null) => void;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: ActiveSessionSetter;
  userScrolledUpRef: React.MutableRefObject<boolean>;
  handleSendMessage: SendMessageFunc;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
}

export const useMessageActions = ({
  messages,
  isLoading,
  activeSessionId,
  editingMessageId,
  activeJobs,
  setCommandedInput,
  setSelectedFiles,
  setEditingMessageId,
  setEditMode,
  setAppFileError,
  updateAndPersistSessions,
  setActiveSessionId,
  userScrolledUpRef,
  handleSendMessage,
  setSessionLoading,
}: MessageActionsProps) => {
  const handleStopGenerating = useCallback(
    (options: { silent?: boolean; skipLoadingUpdate?: boolean } = {}) => {
      const { silent = false, skipLoadingUpdate = false } = options;
      if (!activeSessionId || !isLoading) return;

      const loadingMessage = messages.find((msg) => msg.isLoading);
      if (loadingMessage) {
        const generationId = loadingMessage.id;
        const controller = activeJobs.current.get(generationId);

        if (controller) {
          logService.warn(
            `User stopped generation for session ${activeSessionId}, job ${generationId}. Silent: ${silent}`,
          );
          controller.abort();

          if (!silent) {
            updateAndPersistSessions((prev) =>
              updateMessageInSession(prev, activeSessionId, generationId, {
                isLoading: false,
                generationEndTime: new Date(),
                stoppedByUser: true,
              }),
            );
          }

          if (!skipLoadingUpdate) {
            finishActiveGenerationJob({
              activeJobs,
              setSessionLoading,
              sessionId: activeSessionId,
              generationId,
            });
          } else {
            holdSessionLoadingForGenerationHandoff(activeJobs, activeSessionId);
            unregisterActiveGenerationJob(activeJobs, generationId);
          }
        } else {
          logService.error(
            `Could not find active job to stop for generationId: ${generationId}. Leaving other active jobs untouched.`,
          );
        }
      } else {
        logService.warn(
          `handleStopGenerating called for session ${activeSessionId}, but no loading message was found. Leaving other active jobs untouched.`,
        );

        if (!skipLoadingUpdate) {
          if (!hasActiveGenerationJobForSession(activeJobs, activeSessionId)) {
            setSessionLoading(activeSessionId, false);
          }
        }
      }
    },
    [activeSessionId, isLoading, messages, activeJobs, updateAndPersistSessions, setSessionLoading],
  );

  const handleCancelEdit = useCallback(() => {
    logService.info('User cancelled message edit.');
    setCommandedInput({ text: '', id: Date.now() });
    setSelectedFiles([]);
    setEditingMessageId(null);
    setEditMode('resend'); // Reset to default
    setAppFileError(null);
  }, [setCommandedInput, setSelectedFiles, setEditingMessageId, setEditMode, setAppFileError]);

  const handleEditMessage = useCallback(
    (messageId: string, mode: 'update' | 'resend' = 'resend') => {
      logService.info('User initiated message edit', { messageId, mode });
      const messageToEdit = messages.find((msg) => msg.id === messageId);
      if (messageToEdit) {
        if (isLoading) handleStopGenerating();
        setCommandedInput({ text: messageToEdit.content || '', id: Date.now() });
        setSelectedFiles(messageToEdit.files || []);
        setEditingMessageId(messageId);
        setEditMode(mode);
        setAppFileError(null);
        (document.querySelector(CHAT_INPUT_TEXTAREA_SELECTOR) as HTMLTextAreaElement)?.focus();
      }
    },
    [
      messages,
      isLoading,
      handleStopGenerating,
      setCommandedInput,
      setSelectedFiles,
      setEditingMessageId,
      setEditMode,
      setAppFileError,
    ],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!activeSessionId) return;
      logService.info('User deleted message', { messageId, sessionId: activeSessionId });

      const messageToDelete = messages.find((msg) => msg.id === messageId);
      if (messageToDelete?.isLoading) {
        handleStopGenerating();
      }

      // Cleanup blob URLs for the deleted message
      if (messageToDelete) {
        cleanupFilePreviewUrls(messageToDelete.files);
      }

      const relatedToolMessageIds = new Set(
        messages.filter((msg) => msg.toolParentMessageId === messageId).map((msg) => msg.id),
      );
      relatedToolMessageIds.add(messageId);

      updateAndPersistSessions((prev) =>
        updateSessionById(prev, activeSessionId, (s) => ({
          ...s,
          messages: s.messages.filter((msg) => !relatedToolMessageIds.has(msg.id)),
        })),
      );

      if (editingMessageId === messageId) handleCancelEdit();
      userScrolledUpRef.current = false;
    },
    [
      activeSessionId,
      messages,
      editingMessageId,
      handleStopGenerating,
      updateAndPersistSessions,
      handleCancelEdit,
      userScrolledUpRef,
    ],
  );

  const handleRetryMessage = useCallback(
    async (modelMessageIdToRetry: string) => {
      if (!activeSessionId) return;
      logService.info('User retrying message', { modelMessageId: modelMessageIdToRetry, sessionId: activeSessionId });

      const visibleMessages = getVisibleChatMessages(messages);
      const modelMessageIndex = visibleMessages.findIndex((m) => m.id === modelMessageIdToRetry);
      if (modelMessageIndex < 1) return;

      // Cleanup artifacts (images/audio) from the model message being discarded to prevent memory leaks
      const modelMessage = visibleMessages[modelMessageIndex];
      if (modelMessage.files) cleanupFilePreviewUrls(modelMessage.files);

      const userMessageToResend = visibleMessages[modelMessageIndex - 1];
      if (userMessageToResend.role !== 'user') return;

      if (isLoading) {
        // Stop current generation but keep the session marked as "loading" in UI state
        // because we are about to immediately restart it. This prevents UI flicker.
        handleStopGenerating({ silent: true, skipLoadingUpdate: true });
      }

      try {
        await handleSendMessage({
          text: userMessageToResend.content,
          files: userMessageToResend.files,
          editingId: userMessageToResend.id,
        });
      } finally {
        if (isLoading) {
          releaseSessionLoadingForGenerationHandoff({
            activeJobs,
            setSessionLoading,
            sessionId: activeSessionId,
          });
        }
      }
    },
    [activeSessionId, messages, isLoading, handleStopGenerating, handleSendMessage, activeJobs, setSessionLoading],
  );

  const handleRetryLastTurn = useCallback(async () => {
    if (!activeSessionId) return;

    const lastModelMessage = [...getVisibleChatMessages(messages)]
      .reverse()
      .find((m) => m.role === 'model' || m.role === 'error');

    if (lastModelMessage) {
      logService.info('User retrying last turn via command', {
        modelMessageId: lastModelMessage.id,
        sessionId: activeSessionId,
      });
      await handleRetryMessage(lastModelMessage.id);
    } else {
      logService.warn('Could not retry last turn: no model message found.');
    }
  }, [activeSessionId, messages, handleRetryMessage]);

  const handleEditLastUserMessage = useCallback(() => {
    if (isLoading) {
      handleStopGenerating();
    }
    // Find the last message that was sent by the user
    const lastUserMessage = [...getVisibleChatMessages(messages)].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      logService.info('User editing last message via command', { messageId: lastUserMessage.id });
      handleEditMessage(lastUserMessage.id, 'resend');
    } else {
      logService.warn('Could not edit last message: no user message found.');
    }
  }, [messages, isLoading, handleEditMessage, handleStopGenerating]);

  const handleContinueGeneration = useCallback(
    async (messageId: string) => {
      if (!activeSessionId) return;

      const message = messages.find((m) => m.id === messageId);
      if (!message || message.role !== 'model') return;

      logService.info('User requested Continue Generation', { messageId });

      if (isLoading) {
        handleStopGenerating({ silent: true });
      }

      // IMPORTANT: Ensure UI input is cleared/reset when continuing, to avoid "prefilling" input box
      // although handleSendMessage doesn't use it, UI effects might.
      setCommandedInput(null);
      setAppFileError(null);
      setEditingMessageId(null);

      // Pass isContinueMode: true and the ID of the model message we want to extend
      await handleSendMessage({
        editingId: messageId,
        isContinueMode: true,
      });
    },
    [
      activeSessionId,
      messages,
      isLoading,
      handleStopGenerating,
      handleSendMessage,
      setCommandedInput,
      setAppFileError,
      setEditingMessageId,
    ],
  );

  const handleForkMessage = useCallback(
    (messageId: string) => {
      if (!activeSessionId) return;

      const visibleMessages = getVisibleChatMessages(messages);
      const forkIndex = visibleMessages.findIndex((message) => message.id === messageId);
      if (forkIndex === -1) return;

      const selectedMessage = visibleMessages[forkIndex];
      const sourceIndex = messages.findIndex((message) => message.id === selectedMessage.id);
      if (sourceIndex === -1) return;

      const normalizedMessages = cloneMessagesWithFreshIds(messages.slice(0, sourceIndex + 1));

      let forkedSessionId: string | null = null;

      updateAndPersistSessions((prev) => {
        const sourceSession = prev.find((session) => session.id === activeSessionId);
        if (!sourceSession) return prev;

        const forkedSession = createNewSession(
          sourceSession.settings,
          normalizedMessages,
          `${sourceSession.title} (Fork)`,
          sourceSession.groupId ?? null,
        );
        forkedSessionId = forkedSession.id;
        return [forkedSession, ...prev];
      });

      if (forkedSessionId) {
        logService.info('User forked chat session from message', { messageId, sessionId: activeSessionId });
        setActiveSessionId(forkedSessionId, { history: 'push' });
        userScrolledUpRef.current = false;
      }
    },
    [activeSessionId, messages, updateAndPersistSessions, setActiveSessionId, userScrolledUpRef],
  );

  return {
    handleStopGenerating,
    handleEditMessage,
    handleCancelEdit,
    handleDeleteMessage,
    handleRetryMessage,
    handleRetryLastTurn,
    handleEditLastUserMessage,
    handleContinueGeneration,
    handleForkMessage,
  };
};
