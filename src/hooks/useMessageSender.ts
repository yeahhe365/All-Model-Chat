import type React from 'react';
import { useCallback, useMemo } from 'react';
import {
  type AppSettings,
  type ChatMessage,
  type UploadedFile,
  type ChatSettings as IndividualChatSettings,
} from '@/types';
import { logService } from '@/services/logService';
import { useChatStreamHandler } from '@/features/message-sender/useChatStreamHandler';
import { useModelRequestRunner } from '@/features/message-sender/useModelRequestRunner';
import { useMessageLifecycle } from '@/features/message-sender/useMessageLifecycle';
import { generateLiveArtifactsMessage } from '@/features/message-sender/liveArtifactsStrategy';
import { sendImageEditMessage } from '@/features/message-sender/imageEditStrategy';
import { sendStandardMessage } from '@/features/message-sender/standardChatStrategy';
import { createSenderStoreActions } from '@/features/message-sender/senderStoreActions';
import { sendTtsImagenMessage } from '@/features/message-sender/ttsImagenStrategy';
import { ensureFilesApiReferences } from '@/features/message-sender/fileApiReference';
import { formatMessageSenderText } from '@/features/message-sender/i18nFormat';
import { getModelCapabilities } from '@/utils/modelHelpers';
import { useI18n } from '@/contexts/I18nContext';
import { getApiKeyErrorTranslationKey } from '@/utils/apiUtils';
import type { ImageOutputMode, ImagePersonGeneration } from '@/types/settings';
import { isImageMimeType, isPdfMimeType, isTextFile } from '@/utils/fileTypeUtils';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

const CODE_EXECUTION_TEXT_FILE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024;

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
  sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
  language: 'en' | 'zh';
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
  } = props;
  const senderStoreActions = useMemo(() => createSenderStoreActions(), []);
  const { updateAndPersistSessions, setActiveSessionId, setSessionLoading, activeJobs } = senderStoreActions;

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

  const { runMessageLifecycle } = useMessageLifecycle({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  const { prepareModelRequest } = useModelRequestRunner({
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    translateApiKeyError,
  });

  const handleGenerateLiveArtifacts = useCallback(
    async (sourceMessageId: string, content: string) => {
      await generateLiveArtifactsMessage({
        appSettings,
        currentChatSettings,
        activeSessionId,
        updateAndPersistSessions,
        getStreamHandlers,
        setAppFileError,
        aspectRatio,
        language: props.language,
        runMessageLifecycle,
        sourceMessageId,
        content,
      });
    },
    [
      appSettings,
      currentChatSettings,
      activeSessionId,
      updateAndPersistSessions,
      getStreamHandlers,
      setAppFileError,
      aspectRatio,
      props.language,
      runMessageLifecycle,
    ],
  );

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
      const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
      const activeModelId = isOpenAICompatibleMode ? appSettings.openaiCompatibleModelId : sessionToUpdate.modelId;
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
      const fileReferenceResult = isOpenAICompatibleMode
        ? ({ ok: true, files: filesToUse } as const)
        : await ensureFilesApiReferences({
            files: filesToUse,
            apiKey: keyToUse,
            abortSignal: newAbortController.signal,
            onFileUpdate: (fileId, patch) => {
              if (overrideOptions?.files !== undefined) {
                return;
              }

              setSelectedFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, ...patch } : file)));
            },
          });

      if (!fileReferenceResult.ok) {
        const template = t(fileReferenceResult.errorKey);
        setAppFileError(
          fileReferenceResult.fileName
            ? formatMessageSenderText(template, { filename: fileReferenceResult.fileName })
            : template,
        );
        return;
      }
      const filesReadyForSend = fileReferenceResult.files;

      if (appSettings.isAutoScrollOnSendEnabled) {
        userScrolledUpRef.current = false;
      }
      if (overrideOptions?.files === undefined) setSelectedFiles([]);

      if (isTtsModel || isImagenModel) {
        await sendTtsImagenMessage({
          keyToUse,
          activeSessionId,
          generationId,
          abortController: newAbortController,
          appSettings,
          currentChatSettings: sessionToUpdate,
          text: textToUse.trim(),
          aspectRatio,
          imageSize,
          personGeneration,
          shouldLockKey,
          updateAndPersistSessions,
          setActiveSessionId,
          runMessageLifecycle,
          t,
        });
        if (editingMessageId) setEditingMessageId(null);
        return;
      }

      if (isImageEditModel || (isGemini3Image && appSettings.generateQuadImages)) {
        const editIndex = effectiveEditingId ? messages.findIndex((m) => m.id === effectiveEditingId) : -1;
        const historyMessages = editIndex !== -1 ? messages.slice(0, editIndex) : messages;
        await sendImageEditMessage({
          keyToUse,
          activeSessionId,
          messages: historyMessages,
          generationId,
          abortController: newAbortController,
          appSettings,
          currentChatSettings: sessionToUpdate,
          text: textToUse.trim(),
          files: filesReadyForSend,
          editingMessageId: effectiveEditingId,
          aspectRatio,
          imageSize,
          imageOutputMode,
          personGeneration,
          shouldLockKey,
          updateAndPersistSessions,
          setActiveSessionId,
          runMessageLifecycle,
          t,
        });
        if (editingMessageId) setEditingMessageId(null);
        return;
      }

      await sendStandardMessage({
        props: {
          ...props,
          ...senderStoreActions,
        },
        getStreamHandlers,
        handleGenerateLiveArtifacts,
        runMessageLifecycle,
        text: textToUse,
        files: filesReadyForSend,
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
      updateAndPersistSessions,
      setActiveSessionId,
      getStreamHandlers,
      handleGenerateLiveArtifacts,
      runMessageLifecycle,
      senderStoreActions,
      props,
      prepareModelRequest,
      t,
    ],
  );

  return { handleSendMessage, handleGenerateLiveArtifacts };
};
