import { useCallback, useMemo, useRef } from 'react';
import { UploadedFile, VideoMetadata } from '../../types';
import { MediaResolution } from '../../types/settings';
import { useI18n } from '../../contexts/I18nContext';
import { useChatInputState } from './useChatInputState';
import { useWindowContext } from '../../contexts/WindowContext';
import { getModelCapabilities } from '../../utils/modelHelpers';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands, type SlashCommandState } from '../useSlashCommands';
import { useLiveAPI } from '../useLiveAPI';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { processClipboardData } from '../../utils/clipboardUtils';
import { getKeyForRequest } from '../../utils/apiUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useChatAreaInput } from '../../contexts/ChatAreaContext';
import {
  areFilesStillProcessing,
  buildPendingChatInputSubmission,
} from './pendingSubmissionUtils';
import { hasSendableChatInputContent } from './chatInputUtils';
import { useChatInputFileUi } from './useChatInputFileUi';
import { cleanupFilePreviewUrl } from '../../utils/fileHelpers';
import { buildContentParts } from '../../utils/chat/builder';
import { useMessageQueue } from './useMessageQueue';
import { useFilePreProcessingEffects } from './useFilePreProcessingEffects';
import { useChatInputGlobalEffects } from './useChatInputGlobalEffects';

const YOUTUBE_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;

export const useChatInput = () => {
  const { t } = useI18n();
  const chatInput = useChatAreaInput();
  const {
    appSettings,
    currentChatSettings,
    activeSessionId,
    isEditing,
    onProcessFiles,
    commandedInput,
    onSendMessage,
    onMessageSent,
    setEditingMessageId,
    onTranscribeAudio,
    onUpdateMessageContent,
    onCancelEdit,
    onStopGenerating,
    onToggleGoogleSearch,
    onToggleDeepSearch,
    onToggleCodeExecution,
    onToggleUrlContext,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleCanvasPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onSelectModel,
    availableModels,
    onEditLastUserMessage,
    onTogglePip,
    setCurrentChatSettings,
    onAddUserMessage,
    onLiveTranscript,
    liveClientFunctions,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    isLoading,
    editMode,
    editingMessageId,
    onAddFileById,
    isProcessingFile,
  } = chatInput;

  const inputState = useChatInputState(activeSessionId, isEditing);
  const { setInputText, textareaRef } = inputState;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { document: targetDocument } = useWindowContext();
  const insertText = useTextAreaInsert(textareaRef, setInputText);

  const capabilities = getModelCapabilities(currentChatSettings.modelId);

  const liveAPI = useLiveAPI({
    appSettings,
    chatSettings: currentChatSettings,
    modelId: currentChatSettings.modelId,
    onClose: undefined,
    onTranscript: onLiveTranscript,
    onGeneratedFiles: onLiveTranscript
      ? (files) => onLiveTranscript('', 'model', false, 'content', undefined, files)
      : undefined,
    clientFunctions: liveClientFunctions,
  });

  const filePreProcessing = useFilePreProcessingEffects({
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
    onProcessFiles,
    setSelectedFiles,
    setAppFileError,
  });

  const { modalsState, localFileState } = useChatInputFileUi({
    selectedFiles,
    setSelectedFiles,
    setInputText: inputState.setInputText,
    setAppFileError,
    onProcessFiles,
    onOpenFolderPicker: filePreProcessing.handleOpenFolderPicker,
    onScreenshot: filePreProcessing.handleScreenshot,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    cameraInputRef,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
    textareaRef: inputState.textareaRef,
    isConverting: filePreProcessing.isConverting,
    setIsConverting: filePreProcessing.setIsConverting,
  });

  const voiceState = useVoiceInput({
    onTranscribeAudio,
    setInputText: inputState.setInputText,
    isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
    isSystemAudioRecordingEnabled: appSettings.isSystemAudioRecordingEnabled,
    textareaRef: inputState.textareaRef,
  });

  const slashCommandState = useSlashCommands({
    t,
    onToggleGoogleSearch,
    onToggleDeepSearch,
    onToggleCodeExecution,
    onToggleUrlContext,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleCanvasPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onAttachmentAction: modalsState.handleAttachmentAction,
    availableModels,
    onSelectModel,
    onMessageSent,
    setIsHelpModalOpen: modalsState.setIsHelpModalOpen,
    textareaRef: inputState.textareaRef,
    onEditLastUserMessage,
    setInputText: inputState.setInputText,
    onTogglePip,
    currentModelId: currentChatSettings.modelId,
    onSetThinkingLevel: (level) => setCurrentChatSettings((prev) => ({ ...prev, thinkingLevel: level })),
    thinkingLevel: currentChatSettings.thinkingLevel,
  });

  const isModalOpen =
    modalsState.showCreateTextFileEditor ||
    modalsState.showRecorder ||
    !!localFileState.configuringFile ||
    !!localFileState.previewFile ||
    localFileState.showTokenModal ||
    modalsState.showTtsContextEditor;
  const isAnyModalOpen = isModalOpen || modalsState.isHelpModalOpen;

  const hasSendableContent = hasSendableChatInputContent({
    inputText: inputState.inputText,
    quotes: inputState.quotes,
    selectedFileCount: selectedFiles.length,
    isNativeAudioModel: capabilities.isNativeAudioModel,
  });

  const canSend =
    hasSendableContent && !isLoading && !inputState.isAddingById && !isModalOpen && !localFileState.isConverting;

  const canQueueMessageBase =
    !capabilities.isNativeAudioModel &&
    hasSendableContent &&
    !!activeSessionId &&
    isLoading &&
    !isEditing &&
    !inputState.isAddingById &&
    !isModalOpen &&
    !localFileState.isConverting &&
    !areFilesStillProcessing(selectedFiles);

  const handleSmartSendMessage = useCallback(
    async (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => {
      if (capabilities.isNativeAudioModel) {
        const filesToSend = options?.files ?? selectedFiles;
        let didConnect = liveAPI.isConnected;
        if (!liveAPI.isConnected) {
          try {
            didConnect = await liveAPI.connect();
          } catch (error) {
            console.error('Failed to auto-connect Live API:', error);
            return;
          }
        }

        if (!didConnect) {
          return;
        }

        let enrichedFiles = filesToSend;
        let didSend: boolean;
        if (filesToSend.length > 0) {
          const builtContent = await buildContentParts(
            text,
            filesToSend,
            currentChatSettings.modelId,
            currentChatSettings.mediaResolution,
          );
          enrichedFiles = builtContent.enrichedFiles;
          didSend = await liveAPI.sendContent(builtContent.contentParts);
        } else {
          didSend = await liveAPI.sendText(text);
        }
        if (!didSend) {
          return;
        }

        if (onAddUserMessage) {
          onAddUserMessage(text, enrichedFiles);
        }
        setSelectedFiles([]);
        return;
      }

      onSendMessage(text, options);
    },
    [
      capabilities.isNativeAudioModel,
      currentChatSettings.mediaResolution,
      currentChatSettings.modelId,
      liveAPI,
      onAddUserMessage,
      onSendMessage,
      selectedFiles,
      setSelectedFiles,
    ],
  );

  const completeEditSubmission = useCallback(
    (messageId: string, content: string) => {
      onUpdateMessageContent(messageId, content);
      setEditingMessageId(null);
      inputState.clearCurrentDraft();
      inputState.setInputText('');
      inputState.setQuotes([]);
      onMessageSent();
    },
    [inputState, onMessageSent, onUpdateMessageContent, setEditingMessageId],
  );

  const completeSendSubmission = useCallback(
    (
      textToSend: string,
      isFastMode: boolean,
      options?: {
        files?: UploadedFile[];
        preserveComposer?: boolean;
      },
    ) => {
      const preserveComposer = options?.preserveComposer ?? false;
      const files = options?.files;

      if (!preserveComposer) {
        inputState.clearCurrentDraft();
      }

      handleSmartSendMessage(textToSend, { isFastMode, files });

      if (!preserveComposer) {
        inputState.setInputText('');
        inputState.setQuotes([]);
      }

      onMessageSent();
      inputState.setIsAnimatingSend(true);
      setTimeout(() => inputState.setIsAnimatingSend(false), 400);

      if (!preserveComposer && inputState.isFullscreen) {
        inputState.setIsFullscreen(false);
      }
    },
    [handleSmartSendMessage, inputState, onMessageSent],
  );

  const messageQueue = useMessageQueue({
    activeSessionId,
    modelId: currentChatSettings.modelId,
    inputText: inputState.inputText,
    quotes: inputState.quotes,
    ttsContext: inputState.ttsContext,
    selectedFiles,
    isLoading,
    canQueueMessageBase,
    clearCurrentDraft: inputState.clearCurrentDraft,
    setInputText: inputState.setInputText,
    setQuotes: inputState.setQuotes,
    setIsWaitingForUpload: inputState.setIsWaitingForUpload,
    textareaRef: inputState.textareaRef,
    setSelectedFiles,
    setAppFileError,
    uploadFailureMessage: t('messageSender_fileUploadFailedBeforeSend'),
    completeEditSubmission,
    completeSendSubmission,
  });
  const {
    canQueueMessage,
    activeQueuedSubmission,
    queueCurrentSubmission,
    queuePendingSubmission,
    restoreQueuedSubmission,
    removeQueuedSubmission,
  } = messageQueue;

  const handleAddUrl = useCallback(
    async (url: string) => {
      if (!YOUTUBE_URL_REGEX.test(url)) {
        setAppFileError('Invalid YouTube URL provided.');
        return;
      }

      inputState.justInitiatedFileOpRef.current = true;
      const newUrlFile: UploadedFile = {
        id: `url-${Date.now()}`,
        name: url.length > 30 ? `${url.substring(0, 27)}...` : url,
        type: 'video/youtube-link',
        size: 0,
        fileUri: url,
        uploadState: 'active',
        isProcessing: false,
      };

      setSelectedFiles((prev) => [...prev, newUrlFile]);
      inputState.setUrlInput('');
      modalsState.setShowAddByUrlInput(false);
      inputState.textareaRef.current?.focus();
    },
    [inputState, modalsState, setAppFileError, setSelectedFiles],
  );

  const handlePasteAction = useCallback(
    async (clipboardData: DataTransfer | null, options: { forceTextInsertion?: boolean } = {}): Promise<boolean> => {
      const inputModalOpen = modalsState.showCreateTextFileEditor || modalsState.showRecorder;

      if (inputState.isAddingById || inputModalOpen) {
        return false;
      }

      const result = processClipboardData(clipboardData, {
        isPasteRichTextAsMarkdownEnabled: appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
        isPasteAsTextFileEnabled: appSettings.isPasteAsTextFileEnabled ?? true,
      });

      if (result.type === 'empty') {
        return false;
      }

      if (result.type === 'files' || result.type === 'large-text-file') {
        inputState.justInitiatedFileOpRef.current = true;
        await onProcessFiles(result.files);
        inputState.textareaRef.current?.focus();
        return true;
      }

      if (result.type === 'markdown') {
        insertText(result.content);
        return true;
      }

      if (result.type === 'text') {
        const pastedText = result.content;

        if (YOUTUBE_URL_REGEX.test(pastedText.trim())) {
          await handleAddUrl(pastedText.trim());
          return true;
        }

        if (options.forceTextInsertion) {
          insertText(pastedText);
          return true;
        }
      }

      return false;
    },
    [
      appSettings.isPasteAsTextFileEnabled,
      appSettings.isPasteRichTextAsMarkdownEnabled,
      handleAddUrl,
      inputState.isAddingById,
      inputState.justInitiatedFileOpRef,
      inputState.textareaRef,
      insertText,
      modalsState.showCreateTextFileEditor,
      modalsState.showRecorder,
      onProcessFiles,
    ],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const didHandle = await handlePasteAction(event.clipboardData);
      if (didHandle) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [handlePasteAction],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      slashCommandState.handleInputChange(event.target.value);
    },
    [slashCommandState],
  );

  const performSubmit = useCallback(
    (isFastMode: boolean) => {
      if (!canSend) {
        return;
      }

      const submission = buildPendingChatInputSubmission({
        inputText: inputState.inputText,
        quotes: inputState.quotes,
        modelId: currentChatSettings.modelId,
        ttsContext: inputState.ttsContext,
        isEditing,
        editMode,
        editingMessageId,
        isFastMode,
      });

      const filesAreStillProcessing = areFilesStillProcessing(selectedFiles);
      if (filesAreStillProcessing) {
        queuePendingSubmission(submission);
        return;
      }

      if (submission.kind === 'edit') {
        completeEditSubmission(submission.messageId, submission.content);
        return;
      }

      completeSendSubmission(submission.textToSend, submission.isFastMode);
    },
    [
      canSend,
      completeEditSubmission,
      completeSendSubmission,
      currentChatSettings.modelId,
      editMode,
      editingMessageId,
      inputState,
      isEditing,
      queuePendingSubmission,
      selectedFiles,
    ],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      performSubmit(false);
    },
    [performSubmit],
  );

  const handleFastSubmit = useCallback(() => {
    performSubmit(true);
  }, [performSubmit]);

  const handleTranslate = useCallback(async () => {
    if (!inputState.inputText.trim() || inputState.isTranslating) {
      return;
    }

    inputState.setIsTranslating(true);
    setAppFileError(null);

    const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
    if ('error' in keyResult) {
      setAppFileError(keyResult.error);
      inputState.setIsTranslating(false);
      return;
    }

    try {
      const translatedText = await geminiServiceInstance.translateText(
        keyResult.key,
        inputState.inputText,
        appSettings.translationTargetLanguage ?? 'English',
        appSettings.inputTranslationModelId,
      );
      inputState.setInputText(translatedText);
    } catch (error) {
      setAppFileError(error instanceof Error ? error.message : 'Translation failed.');
    } finally {
      inputState.setIsTranslating(false);
    }
  }, [appSettings, currentChatSettings, inputState, setAppFileError]);

  const handlePasteFromClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        return;
      }

      inputState.setInputText((prev) => prev + clipboardText);
      setTimeout(() => {
        const textarea = inputState.textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
      }, 0);
    } catch {
      return;
    }
  }, [inputState]);

  const handleClearInput = useCallback(() => {
    inputState.setInputText('');
    setTimeout(() => inputState.textareaRef.current?.focus(), 0);
  }, [inputState]);

  const onCompositionStart = useCallback(() => {
    inputState.isComposingRef.current = true;
  }, [inputState.isComposingRef]);

  const onCompositionEnd = useCallback(() => {
    inputState.isComposingRef.current = false;
  }, [inputState.isComposingRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashCommandState.slashCommandState.isOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => {
            const length = prev.filteredCommands?.length || 0;
            if (length === 0) {
              return prev;
            }

            return { ...prev, selectedIndex: (prev.selectedIndex + 1) % length };
          });
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => {
            const length = prev.filteredCommands?.length || 0;
            if (length === 0) {
              return prev;
            }

            return {
              ...prev,
              selectedIndex: (prev.selectedIndex - 1 + length) % length,
            };
          });
          return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const command =
            slashCommandState.slashCommandState.filteredCommands[slashCommandState.slashCommandState.selectedIndex];
          if (command) {
            slashCommandState.handleCommandSelect(command);
          }
          return;
        }
      }

      if (inputState.isComposingRef.current || event.nativeEvent.isComposing) {
        return;
      }

      if (isShortcutPressed(event, 'global.stopCancel', appSettings)) {
        if (isLoading) {
          event.preventDefault();
          onStopGenerating();
          return;
        }

        if (isEditing) {
          event.preventDefault();
          onCancelEdit();
          return;
        }

        if (slashCommandState.slashCommandState.isOpen) {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => ({ ...prev, isOpen: false }));
          return;
        }

        if (inputState.isFullscreen) {
          event.preventDefault();
          inputState.handleToggleFullscreen();
          return;
        }
      }

      if (isShortcutPressed(event, 'input.editLast', appSettings) && !isLoading && inputState.inputText.length === 0) {
        event.preventDefault();
        onEditLastUserMessage();
        return;
      }

      const isSendPressed = isShortcutPressed(event, 'input.sendMessage', appSettings);
      const isNewLinePressed = isShortcutPressed(event, 'input.newLine', appSettings);

      if (isSendPressed) {
        if (
          inputState.isMobile &&
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          return;
        }

        const rawInput = inputState.inputText;
        if (rawInput.startsWith('/')) {
          const handledSlashCommand = slashCommandState.handleSlashCommandExecution(rawInput);
          if (handledSlashCommand) {
            event.preventDefault();
            return;
          }
        }

        if (canSend) {
          event.preventDefault();
          handleSubmit(event as unknown as React.FormEvent);
          return;
        }

        if (canQueueMessage) {
          event.preventDefault();
          queueCurrentSubmission();
        }
        return;
      }

      if (!isNewLinePressed) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = `${value.substring(0, start)}\n${value.substring(end)}`;
      inputState.setInputText(newValue);

      requestAnimationFrame(() => {
        target.selectionStart = start + 1;
        target.selectionEnd = start + 1;
        target.scrollTop = target.scrollHeight;
      });
    },
    [
      appSettings,
      canSend,
      canQueueMessage,
      handleSubmit,
      inputState,
      isEditing,
      isLoading,
      onCancelEdit,
      onEditLastUserMessage,
      onStopGenerating,
      queueCurrentSubmission,
      slashCommandState,
    ],
  );

  const removeSelectedFile = useCallback(
    (fileIdToRemove: string) => {
      setSelectedFiles((prev) => {
        const fileToRemove = prev.find((file) => file.id === fileIdToRemove);
        cleanupFilePreviewUrl(fileToRemove);
        return prev.filter((file) => file.id !== fileIdToRemove);
      });
    },
    [setSelectedFiles],
  );

  const handleAddFileByIdSubmit = useCallback(async () => {
    if (!inputState.fileIdInput.trim() || inputState.isAddingById || isLoading) {
      return;
    }

    inputState.setIsAddingById(true);
    inputState.justInitiatedFileOpRef.current = true;
    await onAddFileById(inputState.fileIdInput.trim());
    inputState.setIsAddingById(false);
    inputState.setFileIdInput('');
  }, [inputState, isLoading, onAddFileById]);

  const handleToggleToolAndFocus = useCallback(
    (toggleFunc: () => void) => {
      toggleFunc();
      setTimeout(() => inputState.textareaRef.current?.focus(), 0);
    },
    [inputState.textareaRef],
  );

  const handleSaveFileConfig = useCallback(
    (
      fileId: string,
      updates: {
        videoMetadata?: VideoMetadata;
        mediaResolution?: MediaResolution;
      },
    ) => {
      setSelectedFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, ...updates } : file)));
    },
    [setSelectedFiles],
  );

  const handlers = useMemo(
    () => ({
      handleFileChange: filePreProcessing.handleFileChange,
      handleFolderChange: filePreProcessing.handleFolderChange,
      handleZipChange: filePreProcessing.handleZipChange,
      handleAddUrl,
      handlePaste,
      handlePasteAction,
      handleInputChange,
      handleSubmit,
      handleFastSubmit,
      handleTranslate,
      handlePasteFromClipboard,
      handleClearInput,
      handleKeyDown,
      onCompositionStart,
      onCompositionEnd,
      removeSelectedFile,
      handleAddFileByIdSubmit,
      handleToggleToolAndFocus,
      handleSaveFileConfig,
      queueCurrentSubmission,
      restoreQueuedSubmission,
      removeQueuedSubmission,
      handlePrevImage: localFileState.handlePrevImage,
      handleNextImage: localFileState.handleNextImage,
      inputImages: localFileState.inputImages,
      currentImageIndex: localFileState.currentImageIndex,
    }),
    [
      handleAddFileByIdSubmit,
      handleAddUrl,
      handleClearInput,
      handleFastSubmit,
      filePreProcessing.handleFileChange,
      filePreProcessing.handleFolderChange,
      filePreProcessing.handleZipChange,
      handleInputChange,
      handleKeyDown,
      handlePaste,
      handlePasteAction,
      handlePasteFromClipboard,
      handleSaveFileConfig,
      queueCurrentSubmission,
      removeQueuedSubmission,
      restoreQueuedSubmission,
      handleSubmit,
      handleToggleToolAndFocus,
      handleTranslate,
      localFileState.currentImageIndex,
      localFileState.handleNextImage,
      localFileState.handlePrevImage,
      localFileState.inputImages,
      onCompositionEnd,
      onCompositionStart,
      removeSelectedFile,
    ],
  );

  useChatInputGlobalEffects({
    appSettings,
    commandedInput,
    isAnyModalOpen,
    isProcessingFile,
    isAddingById: inputState.isAddingById,
    selectedFileCount: selectedFiles.length,
    targetDocument,
    textareaRef: inputState.textareaRef,
    prevIsProcessingFileRef: inputState.prevIsProcessingFileRef,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
    setInputText: inputState.setInputText,
    setQuotes: inputState.setQuotes,
    insertText,
    handlePasteAction,
  });

  return {
    chatInput,
    inputState,
    capabilities,
    liveAPI,
    modalsState,
    localFileState,
    voiceState,
    slashCommandState,
    handlers,
    targetDocument,
    canSend,
    canQueueMessage,
    queuedSubmission: activeQueuedSubmission,
    isAnyModalOpen,
    handleSmartSendMessage,
  };
};
