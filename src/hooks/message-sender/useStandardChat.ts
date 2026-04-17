
import { useCallback } from 'react';
import {
  generateUniqueId,
  buildContentParts,
  getKeyForRequest,
  performOptimisticSessionUpdate,
  logService,
  createChatHistoryForApi,
  isGemini3Model,
  generateSessionTitle,
  createMessage,
} from '../../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS, MODELS_SUPPORTING_RAW_MODE } from '../../constants/appConstants';
import { UploadedFile, ChatMessage, ChatSettings as IndividualChatSettings } from '../../types';
import { StandardChatProps } from './types';
import { buildGenerationConfig } from '../../services/api/baseApi';
import { geminiServiceInstance } from '../../services/geminiService';
import { isLikelyHtml } from '../../utils/codeUtils';
import { ContentPart } from '../../types/chat';

export const useStandardChat = ({
  appSettings,
  currentChatSettings,
  messages,
  setEditingMessageId,
  aspectRatio,
  imageSize,
  userScrolledUpRef,
  activeSessionId,
  setActiveSessionId,
  activeJobs,
  setSessionLoading,
  updateAndPersistSessions,
  getStreamHandlers,
  sessionKeyMapRef,
  handleGenerateCanvas,
}: StandardChatProps) => {
  const updateSessionState = useCallback(
    (params: {
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
    }) => {
      const {
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
      } = params;

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
                  : message
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

        const modelMessage = createMessage('model', isRawMode ? '<thinking>' : '', {
          id: generationId,
          isLoading: true,
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
    [
      activeSessionId,
      appSettings,
      sessionKeyMapRef,
      setActiveSessionId,
      setEditingMessageId,
      updateAndPersistSessions,
    ]
  );

  const performApiCall = useCallback(
    async (params: {
      finalSessionId: string;
      generationId: string;
      generationStartTime: Date;
      keyToUse: string;
      activeModelId: string;
      promptParts: ContentPart[];
      effectiveEditingId: string | null;
      isContinueMode: boolean;
      isRawMode: boolean;
      sessionToUpdate: IndividualChatSettings;
      newAbortController: AbortController;
      textToUse: string;
      enrichedFiles: UploadedFile[];
    }) => {
      const {
        finalSessionId,
        generationId,
        generationStartTime,
        keyToUse,
        activeModelId,
        promptParts,
        effectiveEditingId,
        isContinueMode,
        isRawMode,
        sessionToUpdate,
        newAbortController,
        textToUse,
        enrichedFiles,
      } = params;

      let baseMessagesForApi: ChatMessage[] = messages;
      if (effectiveEditingId) {
        const index = messages.findIndex((message) => message.id === effectiveEditingId);
        if (index !== -1) {
          baseMessagesForApi = messages.slice(0, index);
        }
      }

      let finalRole: 'user' | 'model' = 'user';
      let finalParts = promptParts;

      if (isContinueMode) {
        finalRole = 'model';
        const targetMessage = messages.find((message) => message.id === effectiveEditingId);
        const currentContent = targetMessage?.content || '';
        const isGemini3 = isGemini3Model(activeModelId);

        let prefillContent = currentContent;
        if (!prefillContent.trim()) {
          prefillContent = isGemini3
            ? '<thinking>I have finished reasoning</thinking>'
            : ' ';
        }
        finalParts = [{ text: prefillContent }];
      } else if (isRawMode) {
        const tempUserMessage: ChatMessage = {
          id: 'temp-raw-user',
          role: 'user',
          content: textToUse.trim(),
          files: enrichedFiles,
          timestamp: new Date(),
        };
        baseMessagesForApi = [...baseMessagesForApi, tempUserMessage];
        finalRole = 'model';
        finalParts = [{ text: '<thinking>' }];
      } else if (promptParts.length === 0) {
        setSessionLoading(finalSessionId, false);
        activeJobs.current.delete(generationId);
        return;
      }

      const shouldStripThinking =
        sessionToUpdate.hideThinkingInContext ?? appSettings.hideThinkingInContext;
      const historyForChat = await createChatHistoryForApi(
        baseMessagesForApi,
        shouldStripThinking,
        activeModelId
      );

      const config = await buildGenerationConfig(
        activeModelId,
        sessionToUpdate.systemInstruction,
        {
          temperature: sessionToUpdate.temperature,
          topP: sessionToUpdate.topP,
          topK: sessionToUpdate.topK,
        },
        sessionToUpdate.showThoughts,
        sessionToUpdate.thinkingBudget,
        !!sessionToUpdate.isGoogleSearchEnabled,
        !!sessionToUpdate.isCodeExecutionEnabled,
        !!sessionToUpdate.isUrlContextEnabled,
        sessionToUpdate.thinkingLevel,
        aspectRatio,
        sessionToUpdate.isDeepSearchEnabled,
        imageSize,
        sessionToUpdate.safetySettings,
        sessionToUpdate.mediaResolution,
        !!sessionToUpdate.isLocalPythonEnabled
      );

      const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } =
        getStreamHandlers(
          finalSessionId,
          generationId,
          newAbortController,
          generationStartTime,
          sessionToUpdate,
          (messageId, content) => {
            if (
              !isContinueMode &&
              appSettings.autoCanvasVisualization &&
              content &&
              content.length > 50 &&
              !isLikelyHtml(content)
            ) {
              const trimmed = content.trim();
              if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
                return;
              }
              logService.info('Auto-triggering Canvas visualization for message', {
                msgId: messageId,
              });
              handleGenerateCanvas(messageId, content);
            }
          }
        );

      setSessionLoading(finalSessionId, true);
      activeJobs.current.set(generationId, newAbortController);

      if (appSettings.isStreamingEnabled) {
        await geminiServiceInstance.sendMessageStream(
          keyToUse,
          activeModelId,
          historyForChat,
          finalParts,
          config,
          newAbortController.signal,
          streamOnPart,
          onThoughtChunk,
          streamOnError,
          streamOnComplete,
          finalRole
        );
        return;
      }

      await geminiServiceInstance.sendMessageNonStream(
        keyToUse,
        activeModelId,
        historyForChat,
        finalParts,
        config,
        newAbortController.signal,
        streamOnError,
        (parts, thoughts, usage, grounding) => {
          for (const part of parts) {
            streamOnPart(part);
          }
          if (thoughts) {
            onThoughtChunk(thoughts);
          }
          streamOnComplete(usage, grounding);
        }
      );
    },
    [
      activeJobs,
      appSettings,
      aspectRatio,
      getStreamHandlers,
      handleGenerateCanvas,
      imageSize,
      messages,
      setSessionLoading,
    ]
  );

  const sendStandardMessage = useCallback(
    async (
      textToUse: string,
      filesToUse: UploadedFile[],
      effectiveEditingId: string | null,
      activeModelId: string,
      isContinueMode = false,
      isFastMode = false
    ) => {
      const settingsForPersistence = { ...currentChatSettings };
      const settingsForApi = { ...currentChatSettings };

      if (isFastMode) {
        const isGemini3Flash =
          activeModelId.includes('gemini-3') && activeModelId.includes('flash');
        const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';

        settingsForApi.thinkingLevel = targetLevel;
        settingsForApi.thinkingBudget = 0;
        logService.info(
          `Fast Mode activated (One-off): Overriding thinking level to ${targetLevel}.`
        );
      }

      const keyResult = getKeyForRequest(appSettings, settingsForApi);
      if ('error' in keyResult) {
        logService.error('Send message failed: API Key not configured.');
        const errorMessage: ChatMessage = {
          id: generateUniqueId(),
          role: 'error',
          content: keyResult.error,
          timestamp: new Date(),
        };
        const newSessionId = generateUniqueId();

        updateAndPersistSessions((prev) =>
          performOptimisticSessionUpdate(prev, {
            activeSessionId: null,
            newSessionId,
            newMessages: [errorMessage],
            settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings },
            title: 'API Key Error',
          })
        );
        setActiveSessionId(newSessionId);
        return;
      }

      const { key: keyToUse, isNewKey } = keyResult;
      const shouldLockKey =
        isNewKey && filesToUse.some((file) => file.fileUri && file.uploadState === 'active');

      const newAbortController = new AbortController();

      let generationId: string;
      let generationStartTime: Date;
      if (isContinueMode && effectiveEditingId) {
        generationId = effectiveEditingId;
        const targetMessage = messages.find((message) => message.id === effectiveEditingId);
        generationStartTime = targetMessage?.generationStartTime || new Date();
      } else {
        generationId = generateUniqueId();
        generationStartTime = new Date();
      }

      const successfullyProcessedFiles = filesToUse.filter(
        (file) => file.uploadState === 'active' && !file.error && !file.isProcessing
      );

      const { contentParts: promptParts, enrichedFiles } = await buildContentParts(
        textToUse.trim(),
        successfullyProcessedFiles,
        activeModelId,
        settingsForApi.mediaResolution
      );

      const finalSessionId = activeSessionId || generateUniqueId();
      const isRawMode = Boolean(
        (settingsForApi.isRawModeEnabled ?? appSettings.isRawModeEnabled) &&
          !isContinueMode &&
          MODELS_SUPPORTING_RAW_MODE.some((model) => activeModelId.includes(model))
      );

      updateSessionState({
        finalSessionId,
        textToUse,
        enrichedFiles,
        effectiveEditingId,
        generationId,
        generationStartTime,
        isContinueMode,
        isRawMode,
        sessionToUpdate: settingsForPersistence,
        keyToUse,
        shouldLockKey,
      });

      userScrolledUpRef.current = false;

      await performApiCall({
        finalSessionId,
        generationId,
        generationStartTime,
        keyToUse,
        activeModelId,
        promptParts,
        effectiveEditingId,
        isContinueMode,
        isRawMode,
        sessionToUpdate: settingsForApi,
        newAbortController,
        textToUse,
        enrichedFiles,
      });
    },
    [
      activeSessionId,
      appSettings,
      currentChatSettings,
      messages,
      performApiCall,
      setActiveSessionId,
      updateAndPersistSessions,
      updateSessionState,
      userScrolledUpRef,
    ]
  );

  return { sendStandardMessage };
};
