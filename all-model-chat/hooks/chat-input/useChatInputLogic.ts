import React, { useCallback, useMemo } from 'react';
import { ChatInputProps } from '../../types';
import { useChatInputState } from './useChatInputState';
import { useIsDesktop } from '../useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { useModelCapabilities } from '../useModelCapabilities';
import { useChatInputModals } from './useChatInputModals';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands } from '../useSlashCommands';
import { useChatInputEffects } from './useChatInputEffects';
import { useChatInputLocalState } from './useChatInputLocalState';
import { useLiveAPI } from '../useLiveAPI';

// Direct imports of sub-handlers (Flattening the architecture)
import { useFileSelectionHandlers } from './handlers/useFileSelectionHandlers';
import { useInputAndPasteHandlers } from './handlers/useInputAndPasteHandlers';
import { useSubmissionHandlers } from './handlers/useSubmissionHandlers';
import { useKeyboardHandlers } from './handlers/useKeyboardHandlers';
import { useFileManagementHandlers } from './handlers/useFileManagementHandlers';

export const useChatInputLogic = (props: ChatInputProps) => {
    const {
        appSettings, currentChatSettings, activeSessionId, isEditing,
        onProcessFiles, t, commandedInput, onSendMessage, onMessageSent, 
        setEditingMessageId, onTranscribeAudio, onUpdateMessageContent,
        editingMessageId, editMode, onCancelEdit, onStopGenerating,
        onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, 
        onToggleUrlContext, onClearChat, onNewChat, onOpenSettings,
        onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, 
        onSelectModel, availableModels, onEditLastUserMessage, onTogglePip,
        setCurrentChatSettings, onAddUserMessage, onLiveTranscript,
    } = props;

    // 1. State Management
    const inputState = useChatInputState(activeSessionId, isEditing);
    
    const isDesktop = useIsDesktop();
    const { document: targetDocument } = useWindowContext();

    // 2. Capabilities
    const capabilities = useModelCapabilities(currentChatSettings.modelId);

    // 3. Live API Hook
    const liveAPI = useLiveAPI({
        appSettings,
        chatSettings: currentChatSettings,
        modelId: currentChatSettings.modelId,
        onClose: undefined, // Optional callback
        onTranscript: onLiveTranscript
    });

    // 4. Modals & File Ops
    const modalsState = useChatInputModals({
        onProcessFiles: (files) => onProcessFiles(files),
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        textareaRef: inputState.textareaRef,
    });

    // 5. Local File State & Handlers
    const localFileState = useChatInputLocalState({
        setSelectedFiles: props.setSelectedFiles,
        handleConfirmCreateTextFile: modalsState.handleConfirmCreateTextFile,
        setShowCreateTextFileEditor: modalsState.setShowCreateTextFileEditor,
        setEditingFile: modalsState.setEditingFile,
        editingFile: modalsState.editingFile
    });

    // 6. Voice
    const voiceState = useVoiceInput({
        onTranscribeAudio,
        setInputText: inputState.setInputText,
        isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
        isSystemAudioRecordingEnabled: appSettings.isSystemAudioRecordingEnabled,
        textareaRef: inputState.textareaRef,
    });

    // 7. Slash Commands
    const slashCommandState = useSlashCommands({
        t, 
        onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext, 
        onClearChat, onNewChat, onOpenSettings,
        onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, 
        onStopGenerating, onAttachmentAction: modalsState.handleAttachmentAction,
        availableModels, onSelectModel, onMessageSent, 
        setIsHelpModalOpen: modalsState.setIsHelpModalOpen, 
        textareaRef: inputState.textareaRef, 
        onEditLastUserMessage, 
        setInputText: inputState.setInputText,
        onTogglePip, 
        currentModelId: currentChatSettings.modelId,
        onSetThinkingLevel: (level) => setCurrentChatSettings(prev => ({ ...prev, thinkingLevel: level })),
        thinkingLevel: currentChatSettings.thinkingLevel,
    });

    const isModalOpen = modalsState.showCreateTextFileEditor || modalsState.showRecorder || !!localFileState.configuringFile || !!localFileState.previewFile || localFileState.showTokenModal || modalsState.showTtsContextEditor;
    const isAnyModalOpen = isModalOpen || modalsState.isHelpModalOpen;

    const canSend = (
        (inputState.inputText.trim() !== '' || props.selectedFiles.length > 0 || inputState.quotes.length > 0)
        && !props.isLoading && !inputState.isAddingById && !isModalOpen && !localFileState.isConverting
    );

    // Intercept Send Message for Live API
    const handleSmartSendMessage = useCallback(async (text: string, options?: { isFastMode?: boolean }) => {
        if (capabilities.isNativeAudioModel) {
            // Live API Logic: Auto-connect if needed
            if (!liveAPI.isConnected) {
                try {
                    await liveAPI.connect();
                } catch (error) {
                    console.error("Failed to auto-connect Live API:", error);
                    return;
                }
            }
            
            // Check again if connected (in case connect failed gracefully or was aborted)
            liveAPI.sendText(text);
            
            if (onAddUserMessage) {
                onAddUserMessage(text);
            }
        } else {
            // Standard Chat
            onSendMessage(text, options);
        }
    }, [capabilities.isNativeAudioModel, liveAPI.isConnected, liveAPI.connect, liveAPI.sendText, onSendMessage, onAddUserMessage]);

    // 8. Handlers (Instantiated directly instead of via useChatInputHandlers)
    
    const fileSelectionHandlers = useFileSelectionHandlers({
        onProcessFiles: props.onProcessFiles,
        setSelectedFiles: props.setSelectedFiles,
        setAppFileError: props.setAppFileError,
        setIsConverting: localFileState.setIsConverting,
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        fileInputRef: modalsState.fileInputRef,
        imageInputRef: modalsState.imageInputRef,
        folderInputRef: modalsState.folderInputRef,
        zipInputRef: modalsState.zipInputRef,
    });

    const inputHandlers = useInputAndPasteHandlers({
        setInputText: inputState.setInputText,
        setUrlInput: inputState.setUrlInput,
        setShowAddByUrlInput: modalsState.setShowAddByUrlInput,
        setAppFileError: props.setAppFileError,
        setSelectedFiles: props.setSelectedFiles,
        textareaRef: inputState.textareaRef,
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        onProcessFiles: props.onProcessFiles,
        isAddingById: inputState.isAddingById,
        showCreateTextFileEditor: modalsState.showCreateTextFileEditor,
        showCamera: false,
        showRecorder: modalsState.showRecorder,
        handleSlashInputChange: slashCommandState.handleInputChange,
        isPasteRichTextAsMarkdownEnabled: appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
        isPasteAsTextFileEnabled: appSettings.isPasteAsTextFileEnabled ?? true,
    });

    const submissionHandlers = useSubmissionHandlers({
        canSend,
        selectedFiles: props.selectedFiles,
        setIsWaitingForUpload: inputState.setIsWaitingForUpload,
        isEditing,
        editMode: props.editMode,
        editingMessageId: props.editingMessageId,
        inputText: inputState.inputText,
        quotes: inputState.quotes,
        setInputText: inputState.setInputText,
        setQuotes: inputState.setQuotes,
        onUpdateMessageContent,
        setEditingMessageId,
        onMessageSent,
        clearCurrentDraft: inputState.clearCurrentDraft,
        onSendMessage: handleSmartSendMessage,
        setIsAnimatingSend: inputState.setIsAnimatingSend,
        isFullscreen: inputState.isFullscreen,
        setIsFullscreen: inputState.setIsFullscreen,
        isTranslating: inputState.isTranslating,
        setIsTranslating: inputState.setIsTranslating,
        setAppFileError: props.setAppFileError,
        appSettings,
        currentChatSettings,
        ttsContext: inputState.ttsContext,
    });

    const keyboardHandlers = useKeyboardHandlers({
        appSettings,
        isComposingRef: inputState.isComposingRef,
        slashCommandState: slashCommandState.slashCommandState,
        setSlashCommandState: slashCommandState.setSlashCommandState,
        handleCommandSelect: slashCommandState.handleCommandSelect,
        inputText: inputState.inputText,
        setInputText: inputState.setInputText,
        isMobile: inputState.isMobile,
        isDesktop,
        handleSlashCommandExecution: slashCommandState.handleSlashCommandExecution,
        canSend,
        handleSubmit: submissionHandlers.handleSubmit,
        isFullscreen: inputState.isFullscreen,
        handleToggleFullscreen: inputState.handleToggleFullscreen,
        isLoading: props.isLoading,
        onStopGenerating,
        isEditing,
        onCancelEdit,
        onEditLastUserMessage,
    });

    const fileManagementHandlers = useFileManagementHandlers({
        selectedFiles: props.selectedFiles,
        setSelectedFiles: props.setSelectedFiles,
        fileIdInput: inputState.fileIdInput,
        isAddingById: inputState.isAddingById,
        isLoading: props.isLoading,
        setIsAddingById: inputState.setIsAddingById,
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        onAddFileById: props.onAddFileById,
        setFileIdInput: inputState.setFileIdInput,
        textareaRef: inputState.textareaRef,
        previewFile: localFileState.previewFile,
        setPreviewFile: localFileState.setPreviewFile,
    });

    const handlers = useMemo(() => ({
        ...fileSelectionHandlers,
        ...inputHandlers,
        ...submissionHandlers,
        ...keyboardHandlers,
        ...fileManagementHandlers,
        // Helper specifically for useChatInputPropsBuilder compatibility
        adjustTextareaHeight: () => {}
    }), [fileSelectionHandlers, inputHandlers, submissionHandlers, keyboardHandlers, fileManagementHandlers]);

    // 9. Effects
    useChatInputEffects({
        commandedInput,
        setInputText: inputState.setInputText,
        setQuotes: inputState.setQuotes,
        textareaRef: inputState.textareaRef,
        prevIsProcessingFileRef: inputState.prevIsProcessingFileRef,
        isProcessingFile: props.isProcessingFile,
        isAddingById: inputState.isAddingById,
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        isWaitingForUpload: inputState.isWaitingForUpload,
        setIsWaitingForUpload: inputState.setIsWaitingForUpload,
        selectedFiles: props.selectedFiles,
        clearCurrentDraft: inputState.clearCurrentDraft,
        inputText: inputState.inputText,
        quotes: inputState.quotes,
        onSendMessage: handleSmartSendMessage,
        onMessageSent,
        setIsAnimatingSend: inputState.setIsAnimatingSend,
        isFullscreen: inputState.isFullscreen,
        setIsFullscreen: inputState.setIsFullscreen,
        isModalOpen: isAnyModalOpen,
        handlePasteAction: handlers.handlePasteAction,
        appSettings,
    });

    return {
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
        handleSmartSendMessage
    };
};
