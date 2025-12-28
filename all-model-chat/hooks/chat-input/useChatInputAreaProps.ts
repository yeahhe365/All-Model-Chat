
import React from 'react';
import { ChatInputAreaProps } from '../../components/chat/input/ChatInputArea';
import { UploadedFile, ChatSettings, AppSettings } from '../../types';
import { Command } from '../../components/chat/input/SlashCommandMenu';

interface FactoryParams {
    // Props passed down from ChatInput
    isImagenModel: boolean;
    isGemini3ImageModel: boolean;
    isTtsModel: boolean;
    ttsVoice?: string;
    setTtsVoice?: (voice: string) => void;
    aspectRatio?: string;
    setAspectRatio?: (ratio: string) => void;
    imageSize?: string;
    setImageSize?: (size: string) => void;
    fileError: string | null;
    isLoading: boolean;
    t: (key: string) => string;
    generateQuadImages: boolean;
    onToggleQuadImages: () => void;
    supportedAspectRatios?: string[];
    supportedImageSizes?: string[];
    selectedFiles: UploadedFile[];
    onCancelUpload: (id: string) => void;
    isGemini3: boolean;
    isRecording: boolean;
    isMicInitializing: boolean;
    isTranscribing: boolean;
    onStopGenerating: () => void;
    isEditing: boolean;
    onCancelEdit: () => void;
    canSend: boolean;
    isWaitingForUpload: boolean;
    isGoogleSearchEnabled: boolean;
    onToggleGoogleSearch: () => void;
    isCodeExecutionEnabled: boolean;
    onToggleCodeExecution: () => void;
    isUrlContextEnabled: boolean;
    onToggleUrlContext: () => void;
    isDeepSearchEnabled: boolean;
    onToggleDeepSearch: () => void;
    editMode: 'update' | 'resend';
    showEmptyStateSuggestions?: boolean;
    onSuggestionClick?: (suggestion: string) => void;
    onOrganizeInfoClick?: (suggestion: string) => void;
    isNativeAudioModel?: boolean;

    // State from hooks
    fileIdInput: string;
    setFileIdInput: (val: string) => void;
    isAddingById: boolean;
    showAddByIdInput: boolean;
    urlInput: string;
    setUrlInput: (val: string) => void;
    isAddingByUrl: boolean;
    showAddByUrlInput: boolean;
    inputText: string;
    quoteText: string;
    setQuoteText: (val: string) => void;
    isTranslating: boolean;
    isFullscreen: boolean;
    isPipActive?: boolean;
    isAnimatingSend: boolean;
    isMobile: boolean;
    isConverting: boolean;
    isModalOpen: boolean;
    slashCommandState: {
        isOpen: boolean;
        filteredCommands: Command[];
        selectedIndex: number;
    };

    // Refs
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    imageInputRef: React.RefObject<HTMLInputElement>;
    folderInputRef: React.RefObject<HTMLInputElement>;
    zipInputRef: React.RefObject<HTMLInputElement>;
    cameraInputRef: React.RefObject<HTMLInputElement>;

    // Handlers
    handlers: {
        handleAddFileByIdSubmit: () => void;
        handleAddUrl: (url: string) => void;
        removeSelectedFile: (id: string) => void;
        handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
        handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
        adjustTextareaHeight: () => void;
        handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleFolderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleZipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleSubmit: (e: React.FormEvent) => void;
        handleToggleToolAndFocus: (fn: () => void) => void;
        handleTranslate: () => void;
        handleCommandSelect: (cmd: Command) => void;
        onCompositionStart: () => void;
        onCompositionEnd: () => void;
        onStartLiveSession: () => void;
        onConfigureFile: (file: UploadedFile) => void;
        onPreviewFile: (file: UploadedFile) => void;
    };

    // UI Setters
    setShowAddByIdInput: (v: boolean) => void;
    setShowAddByUrlInput: (v: boolean) => void;
    setFileIdInput: (v: string) => void; 
    setUrlInput: (v: string) => void;
    setShowTokenModal: (v: boolean) => void;
    handleAttachmentAction: (action: any) => void;
    handleVoiceInputClick: () => void;
    handleCancelRecording: () => void;
    handleToggleFullscreen: () => void;
}

export const useChatInputAreaProps = (params: FactoryParams): ChatInputAreaProps => {
    const {
        isImagenModel, isGemini3ImageModel, isTtsModel, ttsVoice, setTtsVoice,
        aspectRatio, setAspectRatio, imageSize, setImageSize,
        fileError, isLoading, t, generateQuadImages, onToggleQuadImages, supportedAspectRatios, supportedImageSizes,
        selectedFiles, onCancelUpload, isGemini3, isNativeAudioModel,
        isRecording, isMicInitializing, isTranscribing, onStopGenerating, isEditing, onCancelEdit, canSend, isWaitingForUpload,
        isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
        isUrlContextEnabled, onToggleUrlContext, isDeepSearchEnabled, onToggleDeepSearch, editMode,
        fileIdInput, setFileIdInput, isAddingById, showAddByIdInput,
        urlInput, setUrlInput, isAddingByUrl, showAddByUrlInput,
        inputText, quoteText, setQuoteText, isTranslating,
        isFullscreen, isPipActive, isAnimatingSend, isMobile, isConverting, isModalOpen,
        slashCommandState, textareaRef, fileInputRef, imageInputRef, folderInputRef, zipInputRef, cameraInputRef,
        handlers,
        setShowAddByIdInput, setShowAddByUrlInput, setShowTokenModal,
        handleAttachmentAction, handleVoiceInputClick, handleCancelRecording, handleToggleFullscreen,
        showEmptyStateSuggestions, onSuggestionClick, onOrganizeInfoClick
    } = params;

    return {
        toolbarProps: {
            isImagenModel: isImagenModel || false,
            isGemini3ImageModel,
            isTtsModel,
            ttsVoice,
            setTtsVoice,
            aspectRatio,
            setAspectRatio,
            imageSize,
            setImageSize,
            fileError,
            showAddByIdInput,
            fileIdInput,
            setFileIdInput,
            onAddFileByIdSubmit: handlers.handleAddFileByIdSubmit,
            onCancelAddById: () => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); },
            isAddingById,
            showAddByUrlInput,
            urlInput,
            setUrlInput,
            onAddUrlSubmit: () => handlers.handleAddUrl(urlInput),
            onCancelAddUrl: () => { setShowAddByUrlInput(false); setUrlInput(''); textareaRef.current?.focus(); },
            isAddingByUrl,
            isLoading,
            t,
            generateQuadImages,
            onToggleQuadImages,
            supportedAspectRatios,
            supportedImageSizes,
        },
        actionsProps: {
            onAttachmentAction: handleAttachmentAction,
            disabled: isAddingById || isModalOpen || isWaitingForUpload || isConverting,
            isGoogleSearchEnabled,
            onToggleGoogleSearch: () => handlers.handleToggleToolAndFocus(onToggleGoogleSearch),
            isCodeExecutionEnabled,
            onToggleCodeExecution: () => handlers.handleToggleToolAndFocus(onToggleCodeExecution),
            isUrlContextEnabled,
            onToggleUrlContext: () => handlers.handleToggleToolAndFocus(onToggleUrlContext),
            isDeepSearchEnabled,
            onToggleDeepSearch: () => handlers.handleToggleToolAndFocus(onToggleDeepSearch),
            onAddYouTubeVideo: () => { setShowAddByUrlInput(true); textareaRef.current?.focus(); },
            onCountTokens: () => setShowTokenModal(true),
            onRecordButtonClick: handleVoiceInputClick,
            onCancelRecording: handleCancelRecording,
            isRecording,
            isMicInitializing,
            isTranscribing,
            isLoading,
            onStopGenerating,
            isEditing,
            onCancelEdit,
            canSend,
            isWaitingForUpload,
            t: t as any,
            onTranslate: handlers.handleTranslate,
            isTranslating,
            inputText,
            onToggleFullscreen: handleToggleFullscreen,
            isFullscreen,
            editMode,
            isNativeAudioModel,
            onStartLiveSession: handlers.onStartLiveSession,
        },
        slashCommandProps: {
            isOpen: slashCommandState.isOpen,
            commands: slashCommandState.filteredCommands,
            onSelect: handlers.handleCommandSelect,
            selectedIndex: slashCommandState.selectedIndex,
        },
        fileDisplayProps: {
            selectedFiles,
            onRemove: handlers.removeSelectedFile,
            onCancelUpload,
            onConfigure: handlers.onConfigureFile,
            onPreview: handlers.onPreviewFile,
            isGemini3,
        },
        inputProps: {
            value: inputText,
            onChange: handlers.handleInputChange,
            onKeyDown: handlers.handleKeyDown,
            onPaste: handlers.handlePaste,
            textareaRef,
            placeholder: t('chatInputPlaceholder'),
            disabled: isModalOpen || isTranscribing || isWaitingForUpload || isRecording || isConverting,
            onCompositionStart: handlers.onCompositionStart,
            onCompositionEnd: handlers.onCompositionEnd,
            onFocus: handlers.adjustTextareaHeight,
        },
        quoteProps: {
            quoteText,
            onClearQuote: () => setQuoteText('')
        },
        layoutProps: {
            isFullscreen,
            isPipActive,
            isAnimatingSend,
            isMobile,
            initialTextareaHeight: 28,
            isConverting,
        },
        fileInputRefs: {
            fileInputRef,
            imageInputRef,
            folderInputRef,
            zipInputRef,
            cameraInputRef,
            handleFileChange: handlers.handleFileChange,
            handleFolderChange: handlers.handleFolderChange,
            handleZipChange: handlers.handleZipChange,
        },
        formProps: {
            onSubmit: handlers.handleSubmit,
        },
        suggestionsProps: showEmptyStateSuggestions && onSuggestionClick && onOrganizeInfoClick ? {
            show: showEmptyStateSuggestions,
            onSuggestionClick,
            onOrganizeInfoClick
        } : undefined,
        t: t as any
    };
};
