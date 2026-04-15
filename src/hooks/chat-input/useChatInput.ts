import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UploadedFile, VideoMetadata } from '../../types';
import { MediaResolution } from '../../types/settings';
import { useI18n } from '../../contexts/I18nContext';
import { useChatInputState } from './useChatInputState';
import { useIsDesktop } from '../useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { getModelCapabilities } from '../../utils/modelHelpers';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands } from '../useSlashCommands';
import { useLiveAPI } from '../useLiveAPI';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { processClipboardData } from '../../utils/clipboardUtils';
import { generateFolderContext } from '../../utils/folderImportUtils';
import { generateUniqueId, getKeyForRequest } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useImageNavigation } from '../ui/useImageNavigation';
import { useChatAreaInput } from '../../components/layout/chat-area/ChatAreaContext';
import type { AttachmentAction } from '../../components/chat/input/AttachmentMenu';
import { useChatStore } from '../../stores/chatStore';
import { EXTENSION_TO_MIME } from '../../constants/fileConstants';
import { captureScreenImage } from '../../utils/mediaUtils';
import { isTextFile } from '../../utils/fileHelpers';
import {
  areFilesStillProcessing,
  buildPendingChatInputSubmission,
  PendingChatInputSubmission,
  shouldFlushPendingSubmission,
} from './pendingSubmissionUtils';

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
  const {
    setIsWaitingForUpload,
  } = inputState;
  const pendingSubmissionRef = useRef<PendingChatInputSubmission | null>(null);
  const isDesktop = useIsDesktop();
  const { document: targetDocument } = useWindowContext();
  const insertText = useTextAreaInsert(inputState.textareaRef, inputState.setInputText);

  const capabilities = getModelCapabilities(currentChatSettings.modelId);

  const liveAPI = useLiveAPI({
    appSettings,
    chatSettings: currentChatSettings,
    modelId: currentChatSettings.modelId,
    onClose: undefined,
    onTranscript: onLiveTranscript,
    clientFunctions: liveClientFunctions,
  });

  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [showAddByUrlInput, setShowAddByUrlInput] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showTtsContextEditor, setShowTtsContextEditor] = useState(false);

  const [configuringFile, setConfiguringFile] = useState<UploadedFile | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isPreviewEditable, setIsPreviewEditable] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const handleAttachmentAction = useCallback(
    (action: AttachmentAction) => {
      setShowAddByIdInput(false);
      setShowAddByUrlInput(false);

      switch (action) {
        case 'upload':
          fileInputRef.current?.click();
          break;
        case 'gallery':
          imageInputRef.current?.click();
          break;
        case 'folder':
          folderInputRef.current?.click();
          break;
        case 'zip':
          zipInputRef.current?.click();
          break;
        case 'camera':
          cameraInputRef.current?.click();
          break;
        case 'recorder':
          setShowRecorder(true);
          break;
        case 'id':
          setShowAddByIdInput(true);
          break;
        case 'url':
          setShowAddByUrlInput(true);
          break;
        case 'text':
          setEditingFile(null);
          setShowCreateTextFileEditor(true);
          break;
        case 'screenshot':
          void handleScreenshot();
          break;
      }
    },
    [handleScreenshot],
  );

  const handleConfirmCreateTextFile = useCallback(
    async (content: string | Blob, filename: string) => {
      inputState.justInitiatedFileOpRef.current = true;

      const sanitizeFilename = (name: string) => name.trim().replace(/[<>:"/\\|?*]+/g, '_');

      let finalFilename = filename.trim() ? sanitizeFilename(filename) : `file-${Date.now()}.txt`;

      if (!finalFilename.includes('.')) {
        finalFilename += '.md';
      }

      const extension = `.${finalFilename.split('.').pop()?.toLowerCase()}`;
      const mimeType = EXTENSION_TO_MIME[extension] || 'text/plain';
      const newFile = new File([content], finalFilename, { type: mimeType });

      setShowCreateTextFileEditor(false);
      setEditingFile(null);
      await onProcessFiles([newFile]);
    },
    [inputState.justInitiatedFileOpRef, onProcessFiles],
  );

  const handleAudioRecord = useCallback(
    async (file: File) => {
      inputState.justInitiatedFileOpRef.current = true;
      setShowRecorder(false);
      await onProcessFiles([file]);
      inputState.textareaRef.current?.focus();
    },
    [inputState.justInitiatedFileOpRef, inputState.textareaRef, onProcessFiles],
  );

  const handleEditFile = useCallback((file: UploadedFile) => {
    setEditingFile(file);
    setShowCreateTextFileEditor(true);
  }, []);

  const handleSaveTextFile = useCallback(
    async (content: string | Blob, filename: string) => {
      if (editingFile) {
        const size = content instanceof Blob ? content.size : content.length;
        const type = content instanceof Blob ? content.type : 'text/markdown';

        setSelectedFiles((prev) =>
          prev.map((file) =>
            file.id === editingFile.id
              ? {
                  ...file,
                  name: filename.includes('.') ? filename : `${filename}.md`,
                  textContent: typeof content === 'string' ? content : undefined,
                  size,
                  rawFile: new File([content], filename, { type }),
                  dataUrl: content instanceof Blob ? URL.createObjectURL(content) : file.dataUrl,
                }
              : file,
          ),
        );
        setShowCreateTextFileEditor(false);
        setEditingFile(null);
        return;
      }

      await handleConfirmCreateTextFile(content, filename);
    },
    [editingFile, handleConfirmCreateTextFile, setSelectedFiles],
  );

  const handleSavePreviewTextFile = useCallback(
    (fileId: string, content: string, newName: string) => {
      setSelectedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                name: newName,
                textContent: content,
                size: content.length,
                dataUrl: URL.createObjectURL(new File([content], newName, { type: 'text/plain' })),
                rawFile: new File([content], newName, { type: 'text/plain' }),
              }
            : file,
        ),
      );
    },
    [setSelectedFiles],
  );

  const handleConfigureFile = useCallback((file: UploadedFile) => {
    if (isTextFile(file)) {
      setPreviewFile(file);
      setIsPreviewEditable(true);
      return;
    }

    setConfiguringFile(file);
  }, []);

  const handlePreviewFile = useCallback((file: UploadedFile) => {
    setPreviewFile(file);
    setIsPreviewEditable(false);
  }, []);

  const modalsState = {
    showCreateTextFileEditor,
    setShowCreateTextFileEditor,
    editingFile,
    setEditingFile,
    showRecorder,
    setShowRecorder,
    showAddByIdInput,
    setShowAddByIdInput,
    showAddByUrlInput,
    setShowAddByUrlInput,
    isHelpModalOpen,
    setIsHelpModalOpen,
    showTtsContextEditor,
    setShowTtsContextEditor,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    cameraInputRef,
    handleAttachmentAction,
    handleConfirmCreateTextFile,
    handleAudioRecord,
    handleEditFile,
  };

  const localFileState = {
    configuringFile,
    setConfiguringFile,
    previewFile,
    setPreviewFile,
    isPreviewEditable,
    setIsPreviewEditable,
    isConverting,
    setIsConverting,
    showTokenModal,
    setShowTokenModal,
    handleSaveTextFile,
    handleSavePreviewTextFile,
    handleConfigureFile,
    handlePreviewFile,
  };

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

  const canSend =
    (inputState.inputText.trim() !== '' || selectedFiles.length > 0 || inputState.quotes.length > 0) &&
    !isLoading &&
    !inputState.isAddingById &&
    !isModalOpen &&
    !localFileState.isConverting;

  const handleSmartSendMessage = useCallback(
    async (text: string, options?: { isFastMode?: boolean }) => {
      if (capabilities.isNativeAudioModel) {
        if (!liveAPI.isConnected) {
          try {
            await liveAPI.connect();
          } catch (error) {
            console.error('Failed to auto-connect Live API:', error);
            return;
          }
        }

        liveAPI.sendText(text);

        if (onAddUserMessage) {
          onAddUserMessage(text);
        }
        return;
      }

      onSendMessage(text, options);
    },
    [capabilities.isNativeAudioModel, liveAPI, onAddUserMessage, onSendMessage],
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
    (textToSend: string, isFastMode: boolean) => {
      inputState.clearCurrentDraft();
      handleSmartSendMessage(textToSend, { isFastMode });
      inputState.setInputText('');
      inputState.setQuotes([]);
      onMessageSent();
      inputState.setIsAnimatingSend(true);
      setTimeout(() => inputState.setIsAnimatingSend(false), 400);
      if (inputState.isFullscreen) {
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

      pendingSubmissionRef.current = null;
      setIsWaitingForUpload(false);

      if (submission.kind === 'edit') {
        completeEditSubmission(submission.messageId, submission.content);
        return;
      }

      completeSendSubmission(submission.textToSend, submission.isFastMode);
    },
    [completeEditSubmission, completeSendSubmission, setIsWaitingForUpload],
  );

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
        const tempId = generateUniqueId();

        localFileState.setIsConverting(true);
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
          const contextFile = await generateFolderContext(event.target.files);
          setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
          await onProcessFiles([contextFile]);
        } catch (error) {
          console.error(error);
          setAppFileError('Failed to process folder structure.');
          setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
        } finally {
          localFileState.setIsConverting(false);
        }
      }

      if (modalsState.folderInputRef.current) {
        modalsState.folderInputRef.current.value = '';
      }
    },
    [
      inputState.justInitiatedFileOpRef,
      localFileState,
      modalsState.folderInputRef,
      onProcessFiles,
      setAppFileError,
      setSelectedFiles,
    ],
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
      const translatedText = await geminiServiceInstance.translateText(keyResult.key, inputState.inputText);
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
          slashCommandState.setSlashCommandState((prev: any) => {
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
          slashCommandState.setSlashCommandState((prev: any) => {
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
          slashCommandState.setSlashCommandState((prev: any) => ({ ...prev, isOpen: false }));
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

        const trimmedInput = inputState.inputText.trim();
        if (trimmedInput.startsWith('/')) {
          event.preventDefault();
          slashCommandState.handleSlashCommandExecution(trimmedInput);
          return;
        }

        if (canSend) {
          event.preventDefault();
          handleSubmit(event as unknown as React.FormEvent);
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
      handleSubmit,
      inputState,
      isEditing,
      isLoading,
      onCancelEdit,
      onEditLastUserMessage,
      onStopGenerating,
      slashCommandState,
    ],
  );

  const removeSelectedFile = useCallback(
    (fileIdToRemove: string) => {
      setSelectedFiles((prev) => {
        const fileToRemove = prev.find((file) => file.id === fileIdToRemove);
        if (fileToRemove?.dataUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.dataUrl);
        }
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

  const {
    images: inputImages,
    currentIndex: currentImageIndex,
    handlePrev: handlePrevImage,
    handleNext: handleNextImage,
  } = useImageNavigation(selectedFiles, localFileState.previewFile, localFileState.setPreviewFile);

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
      handlePrevImage,
      handleNextImage,
      inputImages,
      currentImageIndex,
      adjustTextareaHeight: () => {},
    }),
    [
      currentImageIndex,
      handleAddFileByIdSubmit,
      handleAddUrl,
      handleFastSubmit,
      handleFileChange,
      handleFolderChange,
      handleInputChange,
      handleKeyDown,
      handleNextImage,
      handlePaste,
      handlePasteAction,
      handlePrevImage,
      handleSaveFileConfig,
      handleSubmit,
      handleToggleToolAndFocus,
      handleTranslate,
      handleZipChange,
      inputImages,
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
      inputState.setQuotes((prev) => [...prev, commandedInput.text]);
    } else if (commandedInput.mode === 'append') {
      inputState.setInputText((prev) => prev + (prev ? '\n' : '') + commandedInput.text);
    } else if (commandedInput.mode === 'insert') {
      insertText(commandedInput.text);
    } else {
      inputState.setInputText(commandedInput.text);
    }

    if (commandedInput.mode === 'insert') {
      return;
    }

    setTimeout(() => {
      const textarea = inputState.textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const textLength = textarea.value.length;
      textarea.setSelectionRange(textLength, textLength);
    }, 0);
  }, [commandedInput, inputState, insertText]);

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
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

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

      if (isShortcutPressed(event as any, 'input.clearDraft', appSettings)) {
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
    isDesktop,
    targetDocument,
    canSend,
    isAnyModalOpen,
    handleSmartSendMessage,
  };
};
