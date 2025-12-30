
import React, { useCallback } from 'react';
import { ChatInputProps } from '../../types';
import { useChatInputState } from './useChatInputState';
import { useIsDesktop } from '../useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { useModelCapabilities } from '../useModelCapabilities';
import { useChatInputModals } from './useChatInputModals';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands } from '../useSlashCommands';
import { useChatInputHandlers } from './useChatInputHandlers';
import { useChatInputEffects } from './useChatInputEffects';
import { useChatInputLocalState } from './useChatInputLocalState';
import { useLiveAPI } from '../useLiveAPI';

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
        adjustTextareaHeight: inputState.adjustTextareaHeight,
        isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
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

    const isModalOpen = modalsState.showCreateTextFileEditor || modalsState.showRecorder || !!localFileState.configuringFile || !!localFileState.previewFile || localFileState.showTokenModal;
    const isAnyModalOpen = isModalOpen || modalsState.isHelpModalOpen;

    const canSend = (
        (inputState.inputText.trim() !== '' || props.selectedFiles.length > 0 || inputState.quoteText.trim() !== '')
        && !props.isLoading && !inputState.isAddingById && !isModalOpen && !localFileState.isConverting
    );

    // Intercept Send Message for Live API
    const handleSmartSendMessage = useCallback(async (text: string) => {
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
            // Note: isConnected state might not update immediately in React render cycle, 
            // but connect() is async and sessionRef in useLiveAPI should be ready.
            liveAPI.sendText(text);
            
            if (onAddUserMessage) {
                onAddUserMessage(text);
            }
        } else {
            // Standard Chat
            onSendMessage(text);
        }
    }, [capabilities.isNativeAudioModel, liveAPI.isConnected, liveAPI.connect, liveAPI.sendText, onSendMessage, onAddUserMessage]);

    // 8. Handlers
    const handlers = useChatInputHandlers({
        ...inputState,
        selectedFiles: props.selectedFiles, setSelectedFiles: props.setSelectedFiles, 
        previewFile: localFileState.previewFile, setPreviewFile: localFileState.setPreviewFile,
        isConverting: localFileState.isConverting, setIsConverting: localFileState.setIsConverting,
        isLoading: props.isLoading, 
        isEditing, editMode, editingMessageId, setEditingMessageId,
        showCreateTextFileEditor: modalsState.showCreateTextFileEditor, 
        showCamera: false, 
        showRecorder: modalsState.showRecorder, 
        setShowAddByUrlInput: modalsState.setShowAddByUrlInput, 
        setShowAddByIdInput: modalsState.setShowAddByIdInput,
        appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError: props.setAppFileError,
        ...slashCommandState,
        handleSlashInputChange: slashCommandState.handleInputChange,
        onProcessFiles, onAddFileById: props.onAddFileById, 
        onSendMessage: handleSmartSendMessage,
        onMessageSent, onUpdateMessageContent,
        onStopGenerating, onCancelEdit, onEditLastUserMessage,
        isMobile: inputState.isMobile, isDesktop, canSend,
    });

    // 9. Effects
    useChatInputEffects({
        commandedInput,
        setInputText: inputState.setInputText,
        setQuoteText: inputState.setQuoteText,
        textareaRef: inputState.textareaRef,
        prevIsProcessingFileRef: inputState.prevIsProcessingFileRef,
        isProcessingFile: props.isProcessingFile,
        isAddingById: inputState.isAddingById,
        justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
        isWaitingForUpload: inputState.isWaitingForUpload,
        selectedFiles: props.selectedFiles,
        clearCurrentDraft: inputState.clearCurrentDraft,
        inputText: inputState.inputText,
        quoteText: inputState.quoteText,
        onSendMessage: handleSmartSendMessage,
        onMessageSent,
        setIsAnimatingSend: inputState.setIsAnimatingSend,
        isFullscreen: inputState.isFullscreen,
        setIsFullscreen: inputState.setIsFullscreen,
        onProcessFiles,
        isModalOpen: isAnyModalOpen,
        isPasteRichTextAsMarkdownEnabled: appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
        isPasteAsTextFileEnabled: appSettings.isPasteAsTextFileEnabled ?? true,
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
