import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { generateFolderContext } from '../../utils/folderImportUtils';
import { readDirectoryHandle } from '../../utils/import-context/directoryHandleReader';
import { getKeyForRequest } from '../../utils/apiUtils';
import { generateUniqueId } from '../../utils/chat/ids';
import { geminiServiceInstance } from '../../services/geminiService';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useChatAreaInput } from '../../contexts/ChatAreaContext';
import { useChatStore } from '../../stores/chatStore';
import { captureScreenImage } from '../../utils/mediaUtils';
import {
  areFilesStillProcessing,
  buildPendingChatInputSubmission,
  buildQueuedChatInputSubmission,
  getBlockingFileUploadFailure,
  PendingChatInputSubmission,
  QueuedChatInputSubmission,
  shouldFlushPendingSubmission,
} from './pendingSubmissionUtils';
import { hasSendableChatInputContent } from './chatInputUtils';
import { useChatInputFileUi } from './useChatInputFileUi';
import { cleanupFilePreviewUrl } from '../../utils/fileHelpers';
import { buildContentParts } from '../../utils/chat/builder';

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
  const { setIsWaitingForUpload, setInputText, setQuotes, textareaRef } = inputState;
  const pendingSubmissionRef = useRef<PendingChatInputSubmission | null>(null);
  const [queuedSubmission, setQueuedSubmission] = useState<QueuedChatInputSubmission | null>(null);
  const flushingQueuedSubmissionRef = useRef<QueuedChatInputSubmission | null>(null);
  const [isConverting, setIsConverting] = useState(false);
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

  const handleScreenshot = useCallback(async () => {
    const blob = await captureScreenImage();

    if (!blob) {
      return;
    }

    const fileName = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    inputState.justInitiatedFileOpRef.current = true;
    await onProcessFiles([file]);
  }, [inputState.justInitiatedFileOpRef, onProcessFiles]);

  const processFolderImport = useCallback(
    async (files: File[] | FileList, emptyDirectoryPaths: string[] = []) => {
      const fileCount = Array.isArray(files) ? files.length : files.length;
      if (fileCount === 0 && emptyDirectoryPaths.length === 0) {
        return;
      }

      const tempId = generateUniqueId();

      setIsConverting(true);
      setSelectedFiles((prev) => [
        ...prev,
        {
          id: tempId,
          name: 'Processing folder...',
          type: 'application/x-directory',
          size: 0,
          isProcessing: true,
          uploadState: 'pending',
        },
      ]);

      try {
        inputState.justInitiatedFileOpRef.current = true;
        const contextFile = await generateFolderContext(files, {
          emptyDirectoryPaths,
        });
        setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
        await onProcessFiles([contextFile]);
      } catch (error) {
        console.error(error);
        setAppFileError('Failed to process folder structure.');
        setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
      } finally {
        setIsConverting(false);
      }
    },
    [inputState.justInitiatedFileOpRef, onProcessFiles, setAppFileError, setSelectedFiles],
  );

  const handleOpenFolderPicker = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
      const dropped = await readDirectoryHandle(directoryHandle);
      await processFolderImport(dropped.files, dropped.emptyDirectoryPaths);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : '';
      if (errorName !== 'AbortError' && errorName !== 'NotAllowedError') {
        console.error(error);
        setAppFileError('Failed to process folder structure.');
      }
    }
  }, [processFolderImport, setAppFileError]);

  const { modalsState, localFileState } = useChatInputFileUi({
    selectedFiles,
    setSelectedFiles,
    setInputText: inputState.setInputText,
    setAppFileError,
    onProcessFiles,
    onOpenFolderPicker: handleOpenFolderPicker,
    onScreenshot: handleScreenshot,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
    textareaRef: inputState.textareaRef,
    isConverting,
    setIsConverting,
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

  const canQueueMessage =
    !capabilities.isNativeAudioModel &&
    hasSendableContent &&
    !!activeSessionId &&
    isLoading &&
    !isEditing &&
    !inputState.isAddingById &&
    !isModalOpen &&
    !localFileState.isConverting &&
    !areFilesStillProcessing(selectedFiles) &&
    !queuedSubmission;

  const activeQueuedSubmission =
    queuedSubmission && queuedSubmission.sessionId === activeSessionId ? queuedSubmission : null;

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

  const flushPendingSubmission = useCallback(
    (submission = pendingSubmissionRef.current) => {
      if (!submission) {
        return;
      }

      const blockingFileFailure = getBlockingFileUploadFailure(useChatStore.getState().selectedFiles);
      if (blockingFileFailure) {
        pendingSubmissionRef.current = null;
        setIsWaitingForUpload(false);
        setAppFileError(t('messageSender_fileUploadFailedBeforeSend'));
        return;
      }

      pendingSubmissionRef.current = null;
      setIsWaitingForUpload(false);

      if (submission.kind === 'edit') {
        completeEditSubmission(submission.messageId, submission.content);
        return;
      }

      completeSendSubmission(submission.textToSend, submission.isFastMode);
    },
    [completeEditSubmission, completeSendSubmission, setAppFileError, setIsWaitingForUpload, t],
  );

  const removeQueuedSubmission = useCallback(() => {
    flushingQueuedSubmissionRef.current = null;
    setQueuedSubmission(null);
  }, []);

  const restoreQueuedSubmission = useCallback(() => {
    if (!queuedSubmission) {
      return;
    }

    flushingQueuedSubmissionRef.current = null;
    setQueuedSubmission(null);
    inputState.setInputText(queuedSubmission.inputText);
    inputState.setQuotes(queuedSubmission.quotes);
    setSelectedFiles(queuedSubmission.files);
    setTimeout(() => inputState.textareaRef.current?.focus(), 0);
  }, [inputState, queuedSubmission, setSelectedFiles]);

  const flushQueuedSubmission = useCallback(
    (submission = queuedSubmission) => {
      if (!submission) {
        return;
      }

      if (flushingQueuedSubmissionRef.current === submission) {
        return;
      }

      flushingQueuedSubmissionRef.current = submission;
      setQueuedSubmission((current) => (current === submission ? null : current));
      completeSendSubmission(submission.textToSend, submission.isFastMode, {
        files: submission.files.length > 0 ? submission.files : undefined,
        preserveComposer: true,
      });
    },
    [completeSendSubmission, queuedSubmission],
  );

  const queueCurrentSubmission = useCallback(() => {
    if (!canQueueMessage || !activeSessionId) {
      return;
    }

    const submission = buildQueuedChatInputSubmission({
      sessionId: activeSessionId,
      inputText: inputState.inputText,
      quotes: inputState.quotes,
      modelId: currentChatSettings.modelId,
      ttsContext: inputState.ttsContext,
      files: selectedFiles,
      isFastMode: false,
    });

    setQueuedSubmission(submission);
    flushingQueuedSubmissionRef.current = null;
    inputState.clearCurrentDraft();
    inputState.setInputText('');
    inputState.setQuotes([]);
    setSelectedFiles([]);
  }, [activeSessionId, canQueueMessage, currentChatSettings.modelId, inputState, selectedFiles, setSelectedFiles]);

  const queuePendingSubmission = useCallback(
    (submission: PendingChatInputSubmission) => {
      pendingSubmissionRef.current = submission;
      setIsWaitingForUpload(true);

      if (!areFilesStillProcessing(useChatStore.getState().selectedFiles)) {
        flushPendingSubmission(submission);
      }
    },
    [flushPendingSubmission, setIsWaitingForUpload],
  );

  useEffect(() => {
    const unsubscribe = useChatStore.subscribe((state, previousState) => {
      if (
        shouldFlushPendingSubmission({
          pendingSubmission: pendingSubmissionRef.current,
          previousFiles: previousState.selectedFiles,
          currentFiles: state.selectedFiles,
        })
      ) {
        flushPendingSubmission();
      }
    });

    return unsubscribe;
  }, [flushPendingSubmission]);

  useEffect(() => {
    if (activeQueuedSubmission && !isLoading) {
      flushQueuedSubmission(activeQueuedSubmission);
    }
  }, [activeQueuedSubmission, flushQueuedSubmission, isLoading]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        inputState.justInitiatedFileOpRef.current = true;
        await onProcessFiles(event.target.files);
      }

      if (modalsState.fileInputRef.current) {
        modalsState.fileInputRef.current.value = '';
      }

      if (modalsState.imageInputRef.current) {
        modalsState.imageInputRef.current.value = '';
      }
    },
    [inputState.justInitiatedFileOpRef, modalsState.fileInputRef, modalsState.imageInputRef, onProcessFiles],
  );

  const handleFolderChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        await processFolderImport(event.target.files);
      }

      if (modalsState.folderInputRef.current) {
        modalsState.folderInputRef.current.value = '';
      }
    },
    [modalsState.folderInputRef, processFolderImport],
  );

  const handleZipChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        inputState.justInitiatedFileOpRef.current = true;
        await onProcessFiles(event.target.files);
      }

      if (modalsState.zipInputRef.current) {
        modalsState.zipInputRef.current.value = '';
      }
    },
    [inputState.justInitiatedFileOpRef, modalsState.zipInputRef, onProcessFiles],
  );

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
      );
      inputState.setInputText(translatedText);
    } catch (error) {
      setAppFileError(error instanceof Error ? error.message : 'Translation failed.');
    } finally {
      inputState.setIsTranslating(false);
    }
  }, [appSettings, currentChatSettings, inputState, setAppFileError]);

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
      handleFileChange,
      handleFolderChange,
      handleZipChange,
      handleAddUrl,
      handlePaste,
      handlePasteAction,
      handleInputChange,
      handleSubmit,
      handleFastSubmit,
      handleTranslate,
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
      handleFastSubmit,
      handleFileChange,
      handleFolderChange,
      handleInputChange,
      handleKeyDown,
      handlePaste,
      handlePasteAction,
      handleSaveFileConfig,
      queueCurrentSubmission,
      removeQueuedSubmission,
      restoreQueuedSubmission,
      handleSubmit,
      handleToggleToolAndFocus,
      handleTranslate,
      handleZipChange,
      localFileState.currentImageIndex,
      localFileState.handleNextImage,
      localFileState.handlePrevImage,
      localFileState.inputImages,
      onCompositionEnd,
      onCompositionStart,
      removeSelectedFile,
    ],
  );

  useEffect(() => {
    if (!commandedInput) {
      return;
    }

    if (commandedInput.mode === 'quote') {
      setQuotes((prev) => [...prev, commandedInput.text]);
    } else if (commandedInput.mode === 'append') {
      setInputText((prev) => prev + (prev ? '\n' : '') + commandedInput.text);
    } else if (commandedInput.mode === 'insert') {
      insertText(commandedInput.text);
    } else {
      setInputText(commandedInput.text);
    }

    if (commandedInput.mode === 'insert') {
      return;
    }

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const textLength = textarea.value.length;
      textarea.setSelectionRange(textLength, textLength);
    }, 0);
  }, [commandedInput, insertText, setInputText, setQuotes, textareaRef]);

  useEffect(() => {
    if (inputState.prevIsProcessingFileRef.current && !isProcessingFile && !inputState.isAddingById) {
      inputState.textareaRef.current?.focus();
      inputState.justInitiatedFileOpRef.current = false;
    }
    inputState.prevIsProcessingFileRef.current = isProcessingFile;
  }, [inputState, isProcessingFile]);

  useEffect(() => {
    const handleGlobalPaste = async (event: ClipboardEvent) => {
      if (isAnyModalOpen) {
        return;
      }

      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        return;
      }

      const didHandle = await handlePasteAction(event.clipboardData, { forceTextInsertion: true });

      if (!didHandle) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const textarea = inputState.textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      setTimeout(() => {
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePasteAction, inputState.textareaRef, isAnyModalOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isAnyModalOpen) {
        return;
      }

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isShortcutPressed(event, 'input.clearDraft', appSettings)) {
        if (isInput && target !== inputState.textareaRef.current) {
          return;
        }
        event.preventDefault();
        inputState.setInputText('');
        inputState.textareaRef.current?.focus();
        return;
      }

      if (isInput || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const textarea = inputState.textareaRef.current;
      if (!textarea) {
        return;
      }

      event.preventDefault();
      textarea.focus();
      inputState.setInputText((prev) => prev + event.key);
      setTimeout(() => {
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [appSettings, inputState, isAnyModalOpen]);

  const prevFileCountRef = useRef(selectedFiles.length);
  useEffect(() => {
    if (selectedFiles.length > prevFileCountRef.current) {
      setTimeout(() => {
        inputState.textareaRef.current?.focus();
      }, 50);
    }

    prevFileCountRef.current = selectedFiles.length;
  }, [inputState.textareaRef, selectedFiles.length]);

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
