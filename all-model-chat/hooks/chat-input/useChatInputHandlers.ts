
import React, { useMemo } from 'react';
import { UploadedFile, AppSettings, ChatSettings as IndividualChatSettings } from '../../types';
import { Command } from '../../components/chat/input/SlashCommandMenu';
import { useFileSelectionHandlers } from '../chat-input-handlers/useFileSelectionHandlers';
import { useInputAndPasteHandlers } from '../chat-input-handlers/useInputAndPasteHandlers';
import { useSubmissionHandlers } from '../chat-input-handlers/useSubmissionHandlers';
import { useKeyboardHandlers } from '../chat-input-handlers/useKeyboardHandlers';
import { useFileManagementHandlers } from '../chat-input-handlers/useFileManagementHandlers';

interface UseChatInputHandlersProps {
    // State & Setters
    inputText: string;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
    quotes: string[];
    setQuotes: React.Dispatch<React.SetStateAction<string[]>>;
    fileIdInput: string;
    setFileIdInput: React.Dispatch<React.SetStateAction<string>>;
    urlInput: string;
    setUrlInput: React.Dispatch<React.SetStateAction<string>>;
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
    previewFile: UploadedFile | null;
    setPreviewFile: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
    
    // UI State
    isAddingById: boolean;
    setIsAddingById: React.Dispatch<React.SetStateAction<boolean>>;
    isAddingByUrl: boolean;
    setIsAddingByUrl: React.Dispatch<React.SetStateAction<boolean>>;
    isTranslating: boolean;
    setIsTranslating: React.Dispatch<React.SetStateAction<boolean>>;
    isConverting: boolean;
    setIsConverting: React.Dispatch<React.SetStateAction<boolean>>;
    isLoading: boolean;
    isFullscreen: boolean;
    setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAnimatingSend: React.Dispatch<React.SetStateAction<boolean>>;
    setIsWaitingForUpload: React.Dispatch<React.SetStateAction<boolean>>;
    isEditing: boolean;
    editMode: 'update' | 'resend';
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    
    // Modals
    showCreateTextFileEditor: boolean;
    showCamera: boolean;
    showRecorder: boolean;
    setShowAddByUrlInput: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAddByIdInput: React.Dispatch<React.SetStateAction<boolean>>;
    
    // Refs
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    imageInputRef: React.RefObject<HTMLInputElement>;
    folderInputRef: React.RefObject<HTMLInputElement>;
    zipInputRef: React.RefObject<HTMLInputElement>;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    isComposingRef: React.MutableRefObject<boolean>;
    
    // Settings & Config
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setAppFileError: (error: string | null) => void;
    
    // Slash Commands
    slashCommandState: { isOpen: boolean; filteredCommands: Command[]; selectedIndex: number; };
    setSlashCommandState: React.Dispatch<React.SetStateAction<any>>;
    handleCommandSelect: (command: Command) => void;
    handleSlashCommandExecution: (text: string) => void;
    handleSlashInputChange: (value: string) => void;
    
    // Core Actions
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    onAddFileById: (fileId: string) => Promise<void>;
    onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
    onMessageSent: () => void;
    onUpdateMessageContent: (messageId: string, content: string) => void;
    adjustTextareaHeight: () => void;
    clearCurrentDraft: () => void;
    handleToggleFullscreen: () => void;
    onStopGenerating: () => void;
    onCancelEdit: () => void;
    onEditLastUserMessage: () => void;
    
    // Environment
    isMobile: boolean;
    isDesktop: boolean;
    canSend: boolean;
}

export const useChatInputHandlers = (props: UseChatInputHandlersProps) => {
    // 1. File Selection Logic
    const { handleFileChange, handleFolderChange, handleZipChange } = useFileSelectionHandlers({
        onProcessFiles: props.onProcessFiles,
        setSelectedFiles: props.setSelectedFiles,
        setAppFileError: props.setAppFileError,
        setIsConverting: props.setIsConverting,
        justInitiatedFileOpRef: props.justInitiatedFileOpRef,
        fileInputRef: props.fileInputRef,
        imageInputRef: props.imageInputRef,
        folderInputRef: props.folderInputRef,
        zipInputRef: props.zipInputRef,
    });

    // 2. Input, Paste, URL logic
    const { handleAddUrl, handlePaste, handleInputChange } = useInputAndPasteHandlers({
        setInputText: props.setInputText,
        setUrlInput: props.setUrlInput,
        setShowAddByUrlInput: props.setShowAddByUrlInput,
        setAppFileError: props.setAppFileError,
        setSelectedFiles: props.setSelectedFiles,
        textareaRef: props.textareaRef,
        justInitiatedFileOpRef: props.justInitiatedFileOpRef,
        onProcessFiles: props.onProcessFiles,
        isAddingById: props.isAddingById,
        showCreateTextFileEditor: props.showCreateTextFileEditor,
        showCamera: props.showCamera,
        showRecorder: props.showRecorder,
        handleSlashInputChange: props.handleSlashInputChange,
        isPasteRichTextAsMarkdownEnabled: props.appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
        isPasteAsTextFileEnabled: props.appSettings.isPasteAsTextFileEnabled ?? true,
    });

    // 3. Submission & Translation
    const { handleSubmit, handleTranslate, handleFastSubmit } = useSubmissionHandlers({
        canSend: props.canSend,
        selectedFiles: props.selectedFiles,
        setIsWaitingForUpload: props.setIsWaitingForUpload,
        isEditing: props.isEditing,
        editMode: props.editMode,
        editingMessageId: props.editingMessageId,
        inputText: props.inputText,
        quotes: props.quotes,
        setInputText: props.setInputText,
        setQuotes: props.setQuotes,
        onUpdateMessageContent: props.onUpdateMessageContent,
        setEditingMessageId: props.setEditingMessageId,
        onMessageSent: props.onMessageSent,
        clearCurrentDraft: props.clearCurrentDraft,
        onSendMessage: props.onSendMessage,
        setIsAnimatingSend: props.setIsAnimatingSend,
        isFullscreen: props.isFullscreen,
        setIsFullscreen: props.setIsFullscreen,
        isTranslating: props.isTranslating,
        setIsTranslating: props.setIsTranslating,
        setAppFileError: props.setAppFileError,
        appSettings: props.appSettings,
        currentChatSettings: props.currentChatSettings,
        adjustTextareaHeight: props.adjustTextareaHeight,
    });

    // 4. Keyboard Handling
    const { handleKeyDown } = useKeyboardHandlers({
        appSettings: props.appSettings, // Pass appSettings
        isComposingRef: props.isComposingRef,
        slashCommandState: props.slashCommandState,
        setSlashCommandState: props.setSlashCommandState,
        handleCommandSelect: props.handleCommandSelect,
        inputText: props.inputText,
        setInputText: props.setInputText,
        isMobile: props.isMobile,
        isDesktop: props.isDesktop,
        handleSlashCommandExecution: props.handleSlashCommandExecution,
        canSend: props.canSend,
        handleSubmit, 
        isFullscreen: props.isFullscreen,
        handleToggleFullscreen: props.handleToggleFullscreen,
        isLoading: props.isLoading,
        onStopGenerating: props.onStopGenerating,
        isEditing: props.isEditing,
        onCancelEdit: props.onCancelEdit,
        onEditLastUserMessage: props.onEditLastUserMessage,
    });

    // 5. File Management (Remove, Add ID, Config, Preview Nav)
    const { 
        removeSelectedFile, 
        handleAddFileByIdSubmit, 
        handleToggleToolAndFocus, 
        handleSaveFileConfig, 
        handlePrevImage, 
        handleNextImage, 
        inputImages, 
        currentImageIndex 
    } = useFileManagementHandlers({
        selectedFiles: props.selectedFiles,
        setSelectedFiles: props.setSelectedFiles,
        fileIdInput: props.fileIdInput,
        isAddingById: props.isAddingById,
        isLoading: props.isLoading,
        setIsAddingById: props.setIsAddingById,
        justInitiatedFileOpRef: props.justInitiatedFileOpRef,
        onAddFileById: props.onAddFileById,
        setFileIdInput: props.setFileIdInput,
        textareaRef: props.textareaRef,
        previewFile: props.previewFile,
        setPreviewFile: props.setPreviewFile,
    });

    // Memoize the return object to stabilize prop references downstream
    return useMemo(() => ({
        handleFileChange,
        handleFolderChange,
        handleZipChange,
        handleAddUrl,
        handlePaste,
        handleInputChange,
        handleSubmit,
        handleFastSubmit,
        handleTranslate,
        handleKeyDown,
        removeSelectedFile,
        handleAddFileByIdSubmit,
        handleToggleToolAndFocus,
        handleSaveFileConfig,
        handlePrevImage,
        handleNextImage,
        inputImages,
        currentImageIndex
    }), [
        handleFileChange, handleFolderChange, handleZipChange,
        handleAddUrl, handlePaste, handleInputChange,
        handleSubmit, handleFastSubmit, handleTranslate, handleKeyDown,
        removeSelectedFile, handleAddFileByIdSubmit,
        handleToggleToolAndFocus, handleSaveFileConfig,
        handlePrevImage, handleNextImage,
        inputImages, currentImageIndex
    ]);
};
