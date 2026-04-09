import React from 'react';
import { createPortal } from 'react-dom';
import { ChatInputProps, ChatInputToolbarProps, ChatInputActionsProps } from '../../../types';
import { useChatInputLogic } from '../../../hooks/chat-input/useChatInputLogic';
import { ChatInputModals } from './ChatInputModals';
import { ChatInputFileModals } from './ChatInputFileModals';
import { ChatInputArea, ChatInputAreaProps } from './ChatInputArea';
import { INITIAL_TEXTAREA_HEIGHT_PX } from '../../../hooks/chat-input/useChatInputState';
import { useChatStore } from '../../../stores/chatStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { translations } from '../../../utils/appUtils';

export type { ChatInputProps };

const ChatInputContent: React.FC<{ effectiveProps: ChatInputProps }> = ({ effectiveProps }) => {
    const {
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
        isAnyModalOpen,
    } = useChatInputLogic(effectiveProps);

    const toolbarProps: ChatInputToolbarProps = {
        isImagenModel: capabilities.isImagenModel || false,
        isGemini3ImageModel: capabilities.isGemini3ImageModel,
        isTtsModel: capabilities.isTtsModel,
        ttsVoice: effectiveProps.currentChatSettings.ttsVoice,
        setTtsVoice: (voice) => effectiveProps.setCurrentChatSettings(prev => ({ ...prev, ttsVoice: voice })),
        aspectRatio: effectiveProps.aspectRatio,
        setAspectRatio: effectiveProps.setAspectRatio,
        imageSize: effectiveProps.imageSize,
        setImageSize: effectiveProps.setImageSize,
        fileError: effectiveProps.fileError,
        showAddByIdInput: modalsState.showAddByIdInput,
        fileIdInput: inputState.fileIdInput,
        setFileIdInput: inputState.setFileIdInput,
        onAddFileByIdSubmit: handlers.handleAddFileByIdSubmit,
        onCancelAddById: () => {
            modalsState.setShowAddByIdInput(false);
            inputState.setFileIdInput('');
            inputState.textareaRef.current?.focus();
        },
        isAddingById: inputState.isAddingById,
        showAddByUrlInput: modalsState.showAddByUrlInput,
        urlInput: inputState.urlInput,
        setUrlInput: inputState.setUrlInput,
        onAddUrlSubmit: () => handlers.handleAddUrl(inputState.urlInput),
        onCancelAddUrl: () => {
            modalsState.setShowAddByUrlInput(false);
            inputState.setUrlInput('');
            inputState.textareaRef.current?.focus();
        },
        isAddingByUrl: inputState.isAddingByUrl,
        isLoading: effectiveProps.isLoading,
        t: effectiveProps.t as unknown as (key: string) => string,
        generateQuadImages: effectiveProps.generateQuadImages,
        onToggleQuadImages: effectiveProps.onToggleQuadImages,
        supportedAspectRatios: capabilities.supportedAspectRatios,
        supportedImageSizes: capabilities.supportedImageSizes,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        mediaResolution: effectiveProps.currentChatSettings.mediaResolution,
        setMediaResolution: (res) => effectiveProps.setCurrentChatSettings(prev => ({ ...prev, mediaResolution: res })),
        ttsContext: inputState.ttsContext,
        onEditTtsContext: () => modalsState.setShowTtsContextEditor(true)
    };

    const actionsProps: ChatInputActionsProps = {
        onAttachmentAction: modalsState.handleAttachmentAction,
        disabled: inputState.isAddingById || isAnyModalOpen || inputState.isWaitingForUpload || localFileState.isConverting,
        isGoogleSearchEnabled: effectiveProps.isGoogleSearchEnabled,
        onToggleGoogleSearch: () => handlers.handleToggleToolAndFocus(effectiveProps.onToggleGoogleSearch),
        isCodeExecutionEnabled: effectiveProps.isCodeExecutionEnabled,
        onToggleCodeExecution: () => handlers.handleToggleToolAndFocus(effectiveProps.onToggleCodeExecution),
        isLocalPythonEnabled: effectiveProps.isLocalPythonEnabled,
        onToggleLocalPython: effectiveProps.onToggleLocalPython ? () => handlers.handleToggleToolAndFocus(effectiveProps.onToggleLocalPython!) : undefined,
        isUrlContextEnabled: effectiveProps.isUrlContextEnabled,
        onToggleUrlContext: () => handlers.handleToggleToolAndFocus(effectiveProps.onToggleUrlContext),
        isDeepSearchEnabled: effectiveProps.isDeepSearchEnabled,
        onToggleDeepSearch: () => handlers.handleToggleToolAndFocus(effectiveProps.onToggleDeepSearch),
        onAddYouTubeVideo: () => {
            modalsState.setShowAddByUrlInput(true);
            inputState.textareaRef.current?.focus();
        },
        onCountTokens: () => localFileState.setShowTokenModal(true),
        onRecordButtonClick: voiceState.handleVoiceInputClick,
        onCancelRecording: voiceState.handleCancelRecording,
        isRecording: voiceState.isRecording,
        isMicInitializing: voiceState.isMicInitializing,
        isTranscribing: voiceState.isTranscribing,
        isLoading: effectiveProps.isLoading,
        onStopGenerating: effectiveProps.onStopGenerating,
        isEditing: effectiveProps.isEditing,
        onCancelEdit: effectiveProps.onCancelEdit,
        canSend: canSend,
        isWaitingForUpload: inputState.isWaitingForUpload,
        t: effectiveProps.t as any,
        onTranslate: handlers.handleTranslate,
        isTranslating: inputState.isTranslating,
        inputText: inputState.inputText,
        onToggleFullscreen: inputState.handleToggleFullscreen,
        isFullscreen: inputState.isFullscreen,
        editMode: effectiveProps.editMode,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        onStartLiveSession: liveAPI.connect,
        isLiveConnected: liveAPI.isConnected,
        isLiveMuted: liveAPI.isMuted,
        onToggleLiveMute: liveAPI.toggleMute,
        onFastSendMessage: handlers.handleFastSubmit
    };

    const areaProps: ChatInputAreaProps = {
        toolbarProps,
        actionsProps,
        slashCommandProps: {
            isOpen: slashCommandState.slashCommandState.isOpen,
            commands: slashCommandState.slashCommandState.filteredCommands,
            onSelect: slashCommandState.handleCommandSelect,
            selectedIndex: slashCommandState.slashCommandState.selectedIndex,
        },
        fileDisplayProps: {
            selectedFiles: effectiveProps.selectedFiles,
            onRemove: handlers.removeSelectedFile,
            onCancelUpload: effectiveProps.onCancelUpload,
            onConfigure: localFileState.handleConfigureFile,
            onPreview: localFileState.handlePreviewFile,
            isGemini3: capabilities.isGemini3,
        },
        inputProps: {
            value: inputState.inputText,
            onChange: handlers.handleInputChange,
            onKeyDown: handlers.handleKeyDown,
            onPaste: handlers.handlePaste,
            textareaRef: inputState.textareaRef,
            placeholder: effectiveProps.t('chatInputPlaceholder'),
            disabled: isAnyModalOpen || voiceState.isTranscribing || inputState.isWaitingForUpload || voiceState.isRecording || localFileState.isConverting,
            onCompositionStart: handlers.onCompositionStart,
            onCompositionEnd: handlers.onCompositionEnd,
        },
        quoteProps: {
            quotes: inputState.quotes,
            onRemoveQuote: (index: number) => inputState.setQuotes(prev => prev.filter((_, i) => i !== index))
        },
        layoutProps: {
            isFullscreen: inputState.isFullscreen,
            isPipActive: effectiveProps.isPipActive,
            isAnimatingSend: inputState.isAnimatingSend,
            isMobile: inputState.isMobile,
            initialTextareaHeight: INITIAL_TEXTAREA_HEIGHT_PX,
            isConverting: localFileState.isConverting,
        },
        fileInputs: {
            fileInput: modalsState.fileInputRef,
            imageInput: modalsState.imageInputRef,
            folderInput: modalsState.folderInputRef,
            zipInput: modalsState.zipInputRef,
            cameraInput: modalsState.cameraInputRef,
            onFileChange: handlers.handleFileChange,
            onFolderChange: handlers.handleFolderChange,
            onZipChange: handlers.handleZipChange,
        },
        formProps: {
            onSubmit: handlers.handleSubmit,
        },
        suggestionsProps: (effectiveProps.showEmptyStateSuggestions && !capabilities.isImagenModel && !capabilities.isTtsModel && !capabilities.isNativeAudioModel && effectiveProps.onSuggestionClick && effectiveProps.onOrganizeInfoClick) ? {
            show: effectiveProps.showEmptyStateSuggestions,
            onSuggestionClick: effectiveProps.onSuggestionClick,
            onOrganizeInfoClick: effectiveProps.onOrganizeInfoClick,
            onToggleBBox: effectiveProps.onToggleBBox,
            isBBoxModeActive: effectiveProps.isBBoxModeActive,
            onToggleGuide: effectiveProps.onToggleGuide,
            isGuideModeActive: effectiveProps.isGuideModeActive
        } : undefined,
        liveStatusProps: {
            isConnected: liveAPI.isConnected,
            isSpeaking: liveAPI.isSpeaking,
            volume: liveAPI.volume,
            error: liveAPI.error,
            onDisconnect: liveAPI.disconnect,
            t: effectiveProps.t,
        },
        t: effectiveProps.t as (key: keyof typeof translations) => string,
        themeId: effectiveProps.themeId
    };

    const chatInputContent = <ChatInputArea {...areaProps} />;

    return (
        <>
            <ChatInputModals
                showRecorder={modalsState.showRecorder}
                onAudioRecord={modalsState.handleAudioRecord}
                onRecorderCancel={() => { modalsState.setShowRecorder(false); inputState.textareaRef.current?.focus(); }}
                showCreateTextFileEditor={modalsState.showCreateTextFileEditor}
                onConfirmCreateTextFile={localFileState.handleSaveTextFile}
                onCreateTextFileCancel={() => { modalsState.setShowCreateTextFileEditor(false); modalsState.setEditingFile(null); inputState.textareaRef.current?.focus(); }}
                isHelpModalOpen={modalsState.isHelpModalOpen}
                onHelpModalClose={() => modalsState.setIsHelpModalOpen(false)}
                allCommandsForHelp={slashCommandState.allCommandsForHelp}
                isProcessingFile={effectiveProps.isProcessingFile}
                isLoading={effectiveProps.isLoading}
                t={effectiveProps.t as unknown as (key: string) => string}
                initialContent={modalsState.editingFile?.textContent || ''}
                initialFilename={modalsState.editingFile?.name || ''}
                isSystemAudioRecordingEnabled={effectiveProps.appSettings.isSystemAudioRecordingEnabled}
                themeId={effectiveProps.themeId}
                isPasteRichTextAsMarkdownEnabled={effectiveProps.appSettings.isPasteRichTextAsMarkdownEnabled ?? true}
                showTtsContextEditor={modalsState.showTtsContextEditor}
                onCloseTtsContextEditor={() => modalsState.setShowTtsContextEditor(false)}
                ttsContext={inputState.ttsContext}
                setTtsContext={inputState.setTtsContext}
            />

            <ChatInputFileModals
                configuringFile={localFileState.configuringFile}
                setConfiguringFile={localFileState.setConfiguringFile}
                showTokenModal={localFileState.showTokenModal}
                setShowTokenModal={localFileState.setShowTokenModal}
                previewFile={localFileState.previewFile}
                setPreviewFile={localFileState.setPreviewFile}
                inputText={inputState.inputText}
                selectedFiles={effectiveProps.selectedFiles}
                appSettings={effectiveProps.appSettings}
                availableModels={effectiveProps.availableModels}
                currentModelId={effectiveProps.currentChatSettings.modelId}
                t={effectiveProps.t as unknown as (key: string) => string}
                isGemini3={capabilities.isGemini3}
                isPreviewEditable={localFileState.isPreviewEditable}
                onSaveTextFile={localFileState.handleSavePreviewTextFile}
                handlers={{
                    handleSaveFileConfig: handlers.handleSaveFileConfig,
                    handlePrevImage: handlers.handlePrevImage,
                    handleNextImage: handlers.handleNextImage,
                    currentImageIndex: handlers.currentImageIndex,
                    inputImages: handlers.inputImages
                }}
            />

            {inputState.isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
        </>
    );
};

export const ChatInput: React.FC<ChatInputProps> = (props) => {
    // Read state directly from stores instead of through props
    const storeSelectedFiles = useChatStore(s => s.selectedFiles);
    const storeSetSelectedFiles = useChatStore(s => s.setSelectedFiles);
    const storeEditingMessageId = useChatStore(s => s.editingMessageId);
    const storeSetEditingMessageId = useChatStore(s => s.setEditingMessageId);
    const storeEditMode = useChatStore(s => s.editMode);
    const storeCommandedInput = useChatStore(s => s.commandedInput);
    const storeAspectRatio = useChatStore(s => s.aspectRatio);
    const storeSetAspectRatio = useChatStore(s => s.setAspectRatio);
    const storeImageSize = useChatStore(s => s.imageSize);
    const storeSetImageSize = useChatStore(s => s.setImageSize);
    const storeIsAppProcessingFile = useChatStore(s => s.isAppProcessingFile);
    const storeAppFileError = useChatStore(s => s.appFileError);
    const storeSetAppFileError = useChatStore(s => s.setAppFileError);
    const storeAppSettings = useSettingsStore(s => s.appSettings);

    // Use store values, falling back to props for backward compatibility
    const selectedFiles = storeSelectedFiles ?? props.selectedFiles;
    const setSelectedFiles = storeSetSelectedFiles ?? props.setSelectedFiles;
    const editingMessageId = storeEditingMessageId ?? props.editingMessageId;
    const setEditingMessageId = storeSetEditingMessageId ?? props.setEditingMessageId;
    const editMode = storeEditMode ?? props.editMode;
    const commandedInput = storeCommandedInput ?? props.commandedInput;
    const aspectRatio = storeAspectRatio ?? props.aspectRatio;
    const setAspectRatio = storeSetAspectRatio ?? props.setAspectRatio;
    const imageSize = storeImageSize ?? props.imageSize;
    const setImageSize = storeSetImageSize ?? props.setImageSize;
    const isAppProcessingFile = storeIsAppProcessingFile ?? props.isProcessingFile;
    const appFileError = storeAppFileError ?? props.fileError;
    const setAppFileError = storeSetAppFileError ?? props.setAppFileError;
    const appSettings = storeAppSettings ?? props.appSettings;

    // Build effective props with store values
    const effectiveProps = {
        ...props,
        selectedFiles,
        setSelectedFiles,
        editingMessageId,
        setEditingMessageId,
        editMode,
        commandedInput,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        isProcessingFile: isAppProcessingFile,
        fileError: appFileError,
        setAppFileError,
        appSettings,
    };

    const chatInputKey = `${effectiveProps.activeSessionId ?? 'no-session'}:${effectiveProps.isEditing ? 'editing' : 'draft'}`;

    return <ChatInputContent key={chatInputKey} effectiveProps={effectiveProps} />;
};
