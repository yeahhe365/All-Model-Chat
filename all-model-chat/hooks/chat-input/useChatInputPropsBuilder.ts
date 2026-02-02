


import { ChatInputProps, ChatInputActionsProps, ChatInputToolbarProps } from '../../types';
import { ChatInputAreaProps } from '../../components/chat/input/ChatInputArea';
import { useChatInputLogic } from './useChatInputLogic';
import { INITIAL_TEXTAREA_HEIGHT_PX } from './useChatInputState';

export const useChatInputPropsBuilder = (
    logic: ReturnType<typeof useChatInputLogic>, 
    props: ChatInputProps
) => {
    const {
        inputState,
        capabilities,
        liveAPI,
        modalsState,
        localFileState,
        voiceState,
        slashCommandState,
        handlers,
        // isDesktop, // Used indirectly
        targetDocument,
        canSend,
        isAnyModalOpen
    } = logic;

    // Direct construction of props avoids the "FactoryParams" boilerplate layer
    const toolbarProps: ChatInputToolbarProps = {
        isImagenModel: capabilities.isImagenModel || false,
        isGemini3ImageModel: capabilities.isGemini3ImageModel,
        isTtsModel: capabilities.isTtsModel,
        ttsVoice: props.currentChatSettings.ttsVoice,
        setTtsVoice: (voice) => props.setCurrentChatSettings(prev => ({ ...prev, ttsVoice: voice })),
        aspectRatio: props.aspectRatio,
        setAspectRatio: props.setAspectRatio,
        imageSize: props.imageSize,
        setImageSize: props.setImageSize,
        fileError: props.fileError,
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
        isLoading: props.isLoading,
        t: props.t,
        generateQuadImages: props.generateQuadImages,
        onToggleQuadImages: props.onToggleQuadImages,
        supportedAspectRatios: capabilities.supportedAspectRatios,
        supportedImageSizes: capabilities.supportedImageSizes,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        mediaResolution: props.currentChatSettings.mediaResolution,
        setMediaResolution: (res) => props.setCurrentChatSettings(prev => ({ ...prev, mediaResolution: res }))
    };

    const actionsProps: ChatInputActionsProps = {
        onAttachmentAction: modalsState.handleAttachmentAction,
        disabled: inputState.isAddingById || isAnyModalOpen || inputState.isWaitingForUpload || localFileState.isConverting,
        isGoogleSearchEnabled: props.isGoogleSearchEnabled,
        onToggleGoogleSearch: () => handlers.handleToggleToolAndFocus(props.onToggleGoogleSearch),
        isCodeExecutionEnabled: props.isCodeExecutionEnabled,
        onToggleCodeExecution: () => handlers.handleToggleToolAndFocus(props.onToggleCodeExecution),
        isUrlContextEnabled: props.isUrlContextEnabled,
        onToggleUrlContext: () => handlers.handleToggleToolAndFocus(props.onToggleUrlContext),
        isDeepSearchEnabled: props.isDeepSearchEnabled,
        onToggleDeepSearch: () => handlers.handleToggleToolAndFocus(props.onToggleDeepSearch),
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
        isLoading: props.isLoading,
        onStopGenerating: props.onStopGenerating,
        isEditing: props.isEditing,
        onCancelEdit: props.onCancelEdit,
        canSend: canSend,
        isWaitingForUpload: inputState.isWaitingForUpload,
        t: props.t as any,
        onTranslate: handlers.handleTranslate,
        isTranslating: inputState.isTranslating,
        inputText: inputState.inputText,
        onToggleFullscreen: inputState.handleToggleFullscreen,
        isFullscreen: inputState.isFullscreen,
        editMode: props.editMode,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        onStartLiveSession: liveAPI.connect,
        // Live specific props injected directly
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
            onSelect: handlers.handleCommandSelect,
            selectedIndex: slashCommandState.slashCommandState.selectedIndex,
        },
        fileDisplayProps: {
            selectedFiles: props.selectedFiles,
            onRemove: handlers.removeSelectedFile,
            onCancelUpload: props.onCancelUpload,
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
            placeholder: props.t('chatInputPlaceholder'),
            // Explicitly excluding isLoading to allow typing during generation
            disabled: isAnyModalOpen || voiceState.isTranscribing || inputState.isWaitingForUpload || voiceState.isRecording || localFileState.isConverting,
            onCompositionStart: handlers.onCompositionStart,
            onCompositionEnd: handlers.onCompositionEnd,
            onFocus: undefined,
        },
        quoteProps: {
            quotes: inputState.quotes,
            onRemoveQuote: (index: number) => inputState.setQuotes(prev => prev.filter((_, i) => i !== index))
        },
        layoutProps: {
            isFullscreen: inputState.isFullscreen,
            isPipActive: props.isPipActive,
            isAnimatingSend: inputState.isAnimatingSend,
            isMobile: inputState.isMobile,
            initialTextareaHeight: INITIAL_TEXTAREA_HEIGHT_PX,
            isConverting: localFileState.isConverting,
        },
        fileInputRefs: {
            fileInputRef: modalsState.fileInputRef,
            imageInputRef: modalsState.imageInputRef,
            folderInputRef: modalsState.folderInputRef,
            zipInputRef: modalsState.zipInputRef,
            cameraInputRef: modalsState.cameraInputRef,
            handleFileChange: handlers.handleFileChange,
            handleFolderChange: handlers.handleFolderChange,
            handleZipChange: handlers.handleZipChange,
        },
        formProps: {
            onSubmit: handlers.handleSubmit,
        },
        suggestionsProps: (props.showEmptyStateSuggestions && !capabilities.isImagenModel && !capabilities.isTtsModel && !capabilities.isNativeAudioModel && props.onSuggestionClick && props.onOrganizeInfoClick) ? {
            show: props.showEmptyStateSuggestions,
            onSuggestionClick: props.onSuggestionClick,
            onOrganizeInfoClick: props.onOrganizeInfoClick,
            onToggleBBox: props.onToggleBBox,
            isBBoxModeActive: props.isBBoxModeActive,
            onToggleGuide: props.onToggleGuide,
            isGuideModeActive: props.isGuideModeActive
        } : undefined,
        liveStatusProps: {
            isConnected: liveAPI.isConnected,
            isSpeaking: liveAPI.isSpeaking,
            volume: liveAPI.volume,
            error: liveAPI.error,
            onDisconnect: liveAPI.disconnect,
        },
        t: props.t as any,
        themeId: props.themeId
    };

    const modalsProps = {
        showRecorder: modalsState.showRecorder,
        onAudioRecord: modalsState.handleAudioRecord,
        onRecorderCancel: () => { modalsState.setShowRecorder(false); inputState.textareaRef.current?.focus(); },
        showCreateTextFileEditor: modalsState.showCreateTextFileEditor,
        onConfirmCreateTextFile: localFileState.handleSaveTextFile,
        onCreateTextFileCancel: () => { modalsState.setShowCreateTextFileEditor(false); modalsState.setEditingFile(null); inputState.textareaRef.current?.focus(); },
        isHelpModalOpen: modalsState.isHelpModalOpen,
        onHelpModalClose: () => modalsState.setIsHelpModalOpen(false),
        allCommandsForHelp: slashCommandState.allCommandsForHelp,
        isProcessingFile: props.isProcessingFile,
        isLoading: props.isLoading,
        t: props.t,
        editingFile: modalsState.editingFile,
        isSystemAudioRecordingEnabled: props.appSettings.isSystemAudioRecordingEnabled,
        themeId: props.themeId,
        isPasteRichTextAsMarkdownEnabled: props.appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
    };

    const fileModalsProps = {
        configuringFile: localFileState.configuringFile,
        setConfiguringFile: localFileState.setConfiguringFile,
        showTokenModal: localFileState.showTokenModal,
        setShowTokenModal: localFileState.setShowTokenModal,
        previewFile: localFileState.previewFile,
        setPreviewFile: localFileState.setPreviewFile,
        inputText: inputState.inputText,
        selectedFiles: props.selectedFiles,
        appSettings: props.appSettings,
        availableModels: props.availableModels,
        currentModelId: props.currentChatSettings.modelId,
        t: props.t,
        isGemini3: capabilities.isGemini3,
        isPreviewEditable: localFileState.isPreviewEditable,
        onSaveTextFile: localFileState.handleSavePreviewTextFile,
        handlers: {
            handleSaveFileConfig: handlers.handleSaveFileConfig,
            handlePrevImage: handlers.handlePrevImage,
            handleNextImage: handlers.handleNextImage,
            currentImageIndex: handlers.currentImageIndex,
            inputImages: handlers.inputImages
        }
    };

    return {
        areaProps,
        modalsProps,
        fileModalsProps,
        liveSessionProps: {
            isConnected: liveAPI.isConnected,
            isSpeaking: liveAPI.isSpeaking,
            volume: liveAPI.volume,
            error: liveAPI.error,
            onDisconnect: liveAPI.disconnect,
        },
        viewState: {
            isFullscreen: inputState.isFullscreen,
            targetDocument
        }
    };
};