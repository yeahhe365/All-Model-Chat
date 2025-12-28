
import { useChatInputAreaProps } from './useChatInputAreaProps';
import { ChatInputProps } from '../../types';
import { useChatInputLogic } from './useChatInputLogic';

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
        isDesktop,
        targetDocument,
        canSend,
        isAnyModalOpen
    } = logic;

    const areaProps = useChatInputAreaProps({
        // Capabilities
        isImagenModel: capabilities.isImagenModel || false,
        isGemini3ImageModel: capabilities.isGemini3ImageModel,
        isTtsModel: capabilities.isTtsModel,
        isGemini3: capabilities.isGemini3,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        supportedAspectRatios: capabilities.supportedAspectRatios,
        supportedImageSizes: capabilities.supportedImageSizes,

        // Settings
        ttsVoice: props.currentChatSettings.ttsVoice,
        setTtsVoice: (voice) => props.setCurrentChatSettings(prev => ({ ...prev, ttsVoice: voice })),
        aspectRatio: props.aspectRatio,
        setAspectRatio: props.setAspectRatio,
        imageSize: props.imageSize,
        setImageSize: props.setImageSize,
        generateQuadImages: props.generateQuadImages,
        onToggleQuadImages: props.onToggleQuadImages,
        
        // Status & Config
        fileError: props.fileError,
        isLoading: props.isLoading,
        t: props.t,
        selectedFiles: props.selectedFiles,
        onCancelUpload: props.onCancelUpload,
        isRecording: voiceState.isRecording,
        isMicInitializing: voiceState.isMicInitializing,
        isTranscribing: voiceState.isTranscribing,
        onStopGenerating: props.onStopGenerating,
        isEditing: props.isEditing,
        onCancelEdit: props.onCancelEdit,
        canSend,
        isWaitingForUpload: inputState.isWaitingForUpload,
        editMode: props.editMode,
        
        // Toggles
        isGoogleSearchEnabled: props.isGoogleSearchEnabled,
        onToggleGoogleSearch: props.onToggleGoogleSearch,
        isCodeExecutionEnabled: props.isCodeExecutionEnabled,
        onToggleCodeExecution: props.onToggleCodeExecution,
        isUrlContextEnabled: props.isUrlContextEnabled,
        onToggleUrlContext: props.onToggleUrlContext,
        isDeepSearchEnabled: props.isDeepSearchEnabled,
        onToggleDeepSearch: props.onToggleDeepSearch,

        // Input State
        fileIdInput: inputState.fileIdInput,
        setFileIdInput: inputState.setFileIdInput,
        isAddingById: inputState.isAddingById,
        showAddByIdInput: modalsState.showAddByIdInput,
        urlInput: inputState.urlInput,
        setUrlInput: inputState.setUrlInput,
        isAddingByUrl: inputState.isAddingByUrl,
        showAddByUrlInput: modalsState.showAddByUrlInput,
        inputText: inputState.inputText,
        quoteText: inputState.quoteText,
        setQuoteText: inputState.setQuoteText,
        isTranslating: inputState.isTranslating,
        isFullscreen: inputState.isFullscreen,
        isPipActive: props.isPipActive,
        isAnimatingSend: inputState.isAnimatingSend,
        isMobile: inputState.isMobile,
        isConverting: localFileState.isConverting,
        isModalOpen: isAnyModalOpen,
        slashCommandState: slashCommandState.slashCommandState,
        
        // Refs
        textareaRef: inputState.textareaRef,
        fileInputRef: modalsState.fileInputRef,
        imageInputRef: modalsState.imageInputRef,
        folderInputRef: modalsState.folderInputRef,
        zipInputRef: modalsState.zipInputRef,
        cameraInputRef: modalsState.cameraInputRef,

        // Handlers
        handlers: {
            ...handlers,
            onCompositionStart: () => inputState.isComposingRef.current = true,
            onCompositionEnd: () => inputState.isComposingRef.current = false,
            onStartLiveSession: liveAPI.isConnected ? liveAPI.disconnect : liveAPI.connect,
            onConfigureFile: localFileState.handleConfigureFile,
            onPreviewFile: localFileState.handlePreviewFile
        },

        // UI Setters
        setShowAddByIdInput: modalsState.setShowAddByIdInput,
        setShowAddByUrlInput: modalsState.setShowAddByUrlInput,
        setShowTokenModal: localFileState.setShowTokenModal,
        handleAttachmentAction: modalsState.handleAttachmentAction,
        handleVoiceInputClick: voiceState.handleVoiceInputClick,
        handleCancelRecording: voiceState.handleCancelRecording,
        handleToggleFullscreen: inputState.handleToggleFullscreen,
        
        // Suggestions
        showEmptyStateSuggestions: props.showEmptyStateSuggestions && !capabilities.isImagenModel && !capabilities.isTtsModel && !capabilities.isNativeAudioModel,
        onSuggestionClick: props.onSuggestionClick,
        onOrganizeInfoClick: props.onOrganizeInfoClick,
    });

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
