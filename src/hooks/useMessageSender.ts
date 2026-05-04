import React, { useCallback } from 'react';
import {
  AppSettings,
  ChatMessage,
  UploadedFile,
  ChatSettings as IndividualChatSettings,
  SavedChatSession,
} from '../types';
import { logService } from '../services/logService';
import { useChatStreamHandler } from './message-sender/useChatStreamHandler';
import { useTtsImagenSender } from './message-sender/useTtsImagenSender';
import { useImageEditSender } from './message-sender/useImageEditSender';
import { useCanvasGenerator } from './message-sender/useCanvasGenerator';
import { useStandardChat } from './message-sender/useStandardChat';
import { useModelRequestRunner } from './message-sender/useModelRequestRunner';
import { getModelCapabilities } from '../utils/modelHelpers';
import { useI18n } from '../contexts/I18nContext';
import { getApiKeyErrorTranslationKey } from '../utils/apiUtils';
import type { ImageOutputMode, ImagePersonGeneration } from '../types/settings';
import { isImageMimeType, isPdfMimeType, isTextFile } from '../utils/fileTypeUtils';

const CODE_EXECUTION_TEXT_FILE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024;

type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void;

interface MessageSenderProps {
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  messages: ChatMessage[];
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  setAppFileError: (error: string | null) => void;
  aspectRatio: string;
  imageSize?: string;
  imageOutputMode: ImageOutputMode;
  personGeneration: ImagePersonGeneration;
  userScrolledUpRef: React.MutableRefObject<boolean>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
  updateAndPersistSessions: SessionsUpdater;
  sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
  language: 'en' | 'zh';
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
}

export const useMessageSender = (props: MessageSenderProps) => {
  const { t } = useI18n();
  const {
    appSettings,
    currentChatSettings,
    messages,
    selectedFiles,
    setSelectedFiles,
    editingMessageId,
    setEditingMessageId,
    setAppFileError,
    aspectRatio,
    imageSize,
    imageOutputMode,
    personGeneration,
    userScrolledUpRef,
    activeSessionId,
    setActiveSessionId,
    activeJobs,
    setSessionLoading,
    updateAndPersistSessions,
  } = props;

  const translateApiKeyError = useCallback(
    (error: string) => {
      const translationKey = getApiKeyErrorTranslationKey(error);
      return translationKey ? t(translationKey) : error;
    },
    [t],
  );

  // Initialize Stream Handler Factory
  const { getStreamHandlers } = useChatStreamHandler({
    appSettings,
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  // Initialize Sub-Hooks
  const { handleGenerateCanvas } = useCanvasGenerator({
    ...props,
    getStreamHandlers,
  });

  const { sendStandardMessage } = useStandardChat({
    ...props,
    getStreamHandlers,
    handleGenerateCanvas,
  });

  const { handleTtsImagenMessage } = useTtsImagenSender({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    setActiveSessionId,
  });

  const { handleImageEditMessage } = useImageEditSender({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    setActiveSessionId,
  });

  const { prepareModelRequest } = useModelRequestRunner({
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    translateApiKeyError,
  });

  const handleSendMessage = useCallback(
    async (overrideOptions?: {
      text?: string;
      files?: UploadedFile[];
      editingId?: string;
      isContinueMode?: boolean;
      isFastMode?: boolean;
    }) => {
      const textToUse = overrideOptions?.text ?? '';
      const filesToUse = overrideOptions?.files ?? selectedFiles;
      const effectiveEditingId = overrideOptions?.editingId ?? editingMessageId;
      const isContinueMode = overrideOptions?.isContinueMode ?? false;
      const isFastMode = overrideOptions?.isFastMode ?? false;

      const sessionToUpdate = currentChatSettings;
      const activeModelId =
        appSettings.apiMode === 'openai-compatible'
          ? appSettings.openaiCompatibleModelId || ''
          : sessionToUpdate.modelId;
      const capabilities = getModelCapabilities(activeModelId);
      const isTtsModel = capabilities.isTtsModel;
      const isImagenModel = capabilities.isRealImagenModel;
      const isImageEditModel = capabilities.isFlashImageModel;
      const isGemini3Image = capabilities.isGemini3ImageModel;
      const permissions = capabilities.permissions ?? {
        canAcceptAttachments: !isImagenModel,
        requiresTextPrompt: isTtsModel || isImagenModel || isImageEditModel || isGemini3Image,
      };

      logService.info(`Sending message with model ${activeModelId}`, {
        textLength: textToUse.length,
        fileCount: filesToUse.length,
        editingId: effectiveEditingId,
        sessionId: activeSessionId,
        isContinueMode,
        isFastMode,
      });

      if (
        !textToUse.trim() &&
        !permissions.requiresTextPrompt &&
        !isContinueMode &&
        filesToUse.filter((f) => f.uploadState === 'active').length === 0
      )
        return;
      if (permissions.requiresTextPrompt && !textToUse.trim()) return;
      if (filesToUse.some((f) => f.isProcessing || (f.uploadState !== 'active' && !f.error))) {
        logService.warn('Send message blocked: files are still processing.');
        setAppFileError(t('messageSender_waitForFiles'));
        return;
      }

      if (filesToUse.some((f) => f.uploadState === 'failed' || f.uploadState === 'cancelled' || !!f.error)) {
        logService.warn('Send message blocked: failed or cancelled attachments are still selected.');
        setAppFileError(t('messageSender_fileUploadFailedBeforeSend'));
        return;
      }

      const isServerCodeExecutionEnabled =
        !!sessionToUpdate.isCodeExecutionEnabled && !sessionToUpdate.isLocalPythonEnabled;
      if (isServerCodeExecutionEnabled) {
        const oversizedTextFile = filesToUse.find(
          (file) =>
            file.uploadState === 'active' && isTextFile(file) && file.size > CODE_EXECUTION_TEXT_FILE_SIZE_LIMIT_BYTES,
        );

        if (oversizedTextFile) {
          logService.warn('Send message blocked: code execution text file is too large.', {
            fileName: oversizedTextFile.name,
            fileSize: oversizedTextFile.size,
          });
          setAppFileError(t('messageSender_codeExecutionTextFileTooLarge'));
          return;
        }
      }

      if (isImageEditModel || isGemini3Image) {
        const allowsPdfReferences = activeModelId === 'gemini-3.1-flash-image-preview';
        const hasUnsupportedAttachments = filesToUse.some((file) => {
          if (isImageMimeType(file.type)) return false;
          if (allowsPdfReferences && isPdfMimeType(file.type)) return false;
          return true;
        });

        if (hasUnsupportedAttachments) {
          logService.warn('Send message blocked: image model received unsupported attachment types.', {
            activeModelId,
            attachmentTypes: filesToUse.map((file) => file.type),
          });
          setAppFileError(
            allowsPdfReferences
              ? t('messageSender_imageModelSupportsImageAndPdfOnly')
              : t('messageSender_imageModelSupportsImageOnly'),
          );
          return;
        }
      }

      const imageReferenceCount = filesToUse.filter((file) => isImageMimeType(file.type)).length;
      if (isGemini3Image && imageReferenceCount > 14) {
        logService.warn('Send message blocked: Gemini 3 image model reference image limit exceeded.', {
          imageReferenceCount,
          activeModelId,
        });
        setAppFileError(t('messageSender_imageReferenceLimit'));
        return;
      }

      if (!permissions.canAcceptAttachments && filesToUse.length > 0) {
        logService.warn('Send message blocked: Imagen models do not support file attachments.');
        setAppFileError(t('messageSender_imagenTextOnly'));
        return;
      }

      setAppFileError(null);

      const continueTargetMessage =
        isContinueMode && effectiveEditingId ? messages.find((message) => message.id === effectiveEditingId) : null;
      const request = prepareModelRequest({
        activeModelId,
        files: filesToUse,
        keySettings: sessionToUpdate,
        generationId: continueTargetMessage ? (effectiveEditingId ?? undefined) : undefined,
        generationStartTime: continueTargetMessage?.generationStartTime,
        messages: {
          noModelSelected: t('messageSender_noModelSelected'),
          noModelTitle: t('messageSender_errorSessionTitle'),
          apiKeyTitle: t('messageSender_apiKeyErrorSessionTitle'),
        },
      });

      if (!request.ok) {
        return;
      }
      const { keyToUse, shouldLockKey, generationId, abortController: newAbortController } = request;

      if (appSettings.isAutoScrollOnSendEnabled) {
        userScrolledUpRef.current = false;
      }
      if (overrideOptions?.files === undefined) setSelectedFiles([]);

      if (isTtsModel || isImagenModel) {
        await handleTtsImagenMessage(
          keyToUse,
          activeSessionId,
          generationId,
          newAbortController,
          appSettings,
          sessionToUpdate,
          textToUse.trim(),
          aspectRatio,
          imageSize,
          personGeneration,
          { shouldLockKey },
        );
        if (editingMessageId) setEditingMessageId(null);
        return;
      }

      if (isImageEditModel || (isGemini3Image && appSettings.generateQuadImages)) {
        const editIndex = effectiveEditingId ? messages.findIndex((m) => m.id === effectiveEditingId) : -1;
        const historyMessages = editIndex !== -1 ? messages.slice(0, editIndex) : messages;
        await handleImageEditMessage(
          keyToUse,
          activeSessionId,
          historyMessages,
          generationId,
          newAbortController,
          appSettings,
          sessionToUpdate,
          textToUse.trim(),
          filesToUse,
          effectiveEditingId,
          aspectRatio,
          imageSize,
          imageOutputMode,
          personGeneration,
          { shouldLockKey },
        );
        if (editingMessageId) setEditingMessageId(null);
        return;
      }

      await sendStandardMessage({
        text: textToUse,
        files: filesToUse,
        editingMessageId: effectiveEditingId,
        activeModelId,
        isContinueMode,
        isFastMode,
        request,
      });
    },
    [
      appSettings,
      currentChatSettings,
      messages,
      selectedFiles,
      setSelectedFiles,
      editingMessageId,
      setEditingMessageId,
      setAppFileError,
      aspectRatio,
      imageSize,
      imageOutputMode,
      personGeneration,
      userScrolledUpRef,
      activeSessionId,
      handleTtsImagenMessage,
      handleImageEditMessage,
      sendStandardMessage,
      prepareModelRequest,
      t,
    ],
  );

  return { handleSendMessage, handleGenerateCanvas };
};
