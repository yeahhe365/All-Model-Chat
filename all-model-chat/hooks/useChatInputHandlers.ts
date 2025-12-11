
import { useCallback } from 'react';
import { UploadedFile, AppSettings, ChatSettings as IndividualChatSettings, VideoMetadata } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, logService, getTranslator } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { generateFolderContext } from '../utils/folderImportUtils';
import { Command } from '../components/chat/input/SlashCommandMenu';
import { MediaResolution } from '../types/settings';

interface UseChatInputHandlersProps {
    // State & Setters
    inputText: string;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
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
    onSendMessage: (text: string) => void;
    onMessageSent: () => void;
    adjustTextareaHeight: () => void;
    clearCurrentDraft: () => void;
    handleToggleFullscreen: () => void;
    
    // Environment
    isMobile: boolean;
    isDesktop: boolean;
    canSend: boolean;
}

export const useChatInputHandlers = (props: UseChatInputHandlersProps) => {
    const {
        inputText, setInputText, fileIdInput, setFileIdInput, urlInput, setUrlInput,
        selectedFiles, setSelectedFiles, previewFile, setPreviewFile,
        isAddingById, setIsAddingById, isAddingByUrl, setIsAddingByUrl,
        isTranslating, setIsTranslating, isConverting, setIsConverting,
        isLoading, isFullscreen, setIsFullscreen, setIsAnimatingSend, setIsWaitingForUpload,
        showCreateTextFileEditor, showCamera, showRecorder, setShowAddByUrlInput, setShowAddByIdInput,
        textareaRef, fileInputRef, imageInputRef, folderInputRef, zipInputRef,
        justInitiatedFileOpRef, isComposingRef,
        appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError,
        slashCommandState, setSlashCommandState, handleCommandSelect, handleSlashCommandExecution, handleSlashInputChange,
        onProcessFiles, onAddFileById, onSendMessage, onMessageSent,
        adjustTextareaHeight, clearCurrentDraft, handleToggleFullscreen,
        isMobile, isDesktop, canSend
    } = props;

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            justInitiatedFileOpRef.current = true;
            await onProcessFiles(event.target.files);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (imageInputRef.current) imageInputRef.current.value = "";
    }, [onProcessFiles, justInitiatedFileOpRef, fileInputRef, imageInputRef]);

    const handleFolderChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            const tempId = generateUniqueId();
            setIsConverting(true);
            setSelectedFiles(prev => [...prev, {
                id: tempId,
                name: 'Processing folder...',
                type: 'application/x-directory',
                size: 0,
                isProcessing: true,
                uploadState: 'pending'
            }]);

            try {
                justInitiatedFileOpRef.current = true;
                const contextFile = await generateFolderContext(event.target.files);
                setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                await onProcessFiles([contextFile]);
            } catch (e) {
                console.error(e);
                setAppFileError("Failed to process folder structure.");
                setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
            } finally {
                setIsConverting(false);
            }
        }
        if (folderInputRef.current) folderInputRef.current.value = "";
    }, [setIsConverting, setSelectedFiles, onProcessFiles, setAppFileError, justInitiatedFileOpRef, folderInputRef]);

    const handleZipChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            justInitiatedFileOpRef.current = true;
            // useFileUpload already has logic to auto-detect and convert .zip files
            await onProcessFiles(event.target.files);
        }
        if (zipInputRef.current) zipInputRef.current.value = "";
    }, [onProcessFiles, justInitiatedFileOpRef, zipInputRef]);

    const handleAddUrl = useCallback(async (url: string) => {
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (!youtubeRegex.test(url)) {
            setAppFileError("Invalid YouTube URL provided.");
            return;
        }
        justInitiatedFileOpRef.current = true;
        const newUrlFile: UploadedFile = {
            id: `url-${Date.now()}`,
            name: url.length > 30 ? `${url.substring(0, 27)}...` : url,
            type: 'video/youtube-link',
            size: 0,
            fileUri: url,
            uploadState: 'active',
            isProcessing: false,
        };
        setSelectedFiles(prev => [...prev, newUrlFile]);
        setUrlInput('');
        setShowAddByUrlInput(false);
        textareaRef.current?.focus();
    }, [setAppFileError, justInitiatedFileOpRef, setSelectedFiles, setUrlInput, setShowAddByUrlInput, textareaRef]);

    const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
        if (isAddingById || isModalOpen) return;

        const pastedText = event.clipboardData?.getData('text');
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (pastedText && youtubeRegex.test(pastedText)) {
            event.preventDefault();
            await handleAddUrl(pastedText.trim());
            return;
        }

        const items = event.clipboardData?.items;
        if (!items) return;

        const filesToProcess = Array.from(items)
            .filter(item => item.kind === 'file' && ALL_SUPPORTED_MIME_TYPES.includes(item.type))
            .map(item => item.getAsFile()).filter((f): f is File => f !== null);

        if (filesToProcess.length > 0) {
            event.preventDefault();
            justInitiatedFileOpRef.current = true;
            await onProcessFiles(filesToProcess);
        }
    }, [showCreateTextFileEditor, showCamera, showRecorder, isAddingById, handleAddUrl, onProcessFiles, justInitiatedFileOpRef]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleSlashInputChange(e.target.value);
    }, [handleSlashInputChange]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (canSend) {
            const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
            if (filesAreStillProcessing) {
                setIsWaitingForUpload(true);
            } else {
                clearCurrentDraft();
                onSendMessage(inputText);
                setInputText('');
                onMessageSent();
                setIsAnimatingSend(true);
                setTimeout(() => setIsAnimatingSend(false), 400);
                if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        }
    }, [canSend, selectedFiles, setIsWaitingForUpload, clearCurrentDraft, onSendMessage, inputText, setInputText, onMessageSent, setIsAnimatingSend, isFullscreen, setIsFullscreen]);

    const handleTranslate = useCallback(async () => {
        if (!inputText.trim() || isTranslating) return;

        setIsTranslating(true);
        setAppFileError(null);

        const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            setIsTranslating(false);
            return;
        }

        try {
            const translatedText = await geminiServiceInstance.translateText(keyResult.key, inputText);
            setInputText(translatedText);
            setTimeout(() => adjustTextareaHeight(), 0);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Translation failed.";
            setAppFileError(errorMessage);
        } finally {
            setIsTranslating(false);
        }
    }, [inputText, isTranslating, setAppFileError, appSettings, currentChatSettings, setInputText, adjustTextareaHeight]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isComposingRef.current) return;

        if (slashCommandState.isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.filteredCommands.length, }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.filteredCommands.length) % prev.filteredCommands.length, }));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleCommandSelect(slashCommandState.filteredCommands[slashCommandState.selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, isOpen: false }));
            }
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && (!isMobile || isDesktop)) {
            const trimmedInput = inputText.trim();
            if (trimmedInput.startsWith('/')) {
                e.preventDefault();
                handleSlashCommandExecution(trimmedInput);
                return;
            }
            if (canSend) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
            }
        } else if (e.key === 'Escape' && isFullscreen) {
            e.preventDefault();
            handleToggleFullscreen();
        }
    }, [isComposingRef, slashCommandState, setSlashCommandState, handleCommandSelect, isMobile, isDesktop, inputText, handleSlashCommandExecution, canSend, handleSubmit, isFullscreen, handleToggleFullscreen]);

    const removeSelectedFile = useCallback((fileIdToRemove: string) => {
        setSelectedFiles(prev => {
            const fileToRemove = prev.find(f => f.id === fileIdToRemove);
            if (fileToRemove && fileToRemove.dataUrl && fileToRemove.dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileToRemove.dataUrl);
            }
            return prev.filter(f => f.id !== fileIdToRemove);
        });
    }, [setSelectedFiles]);

    const handleAddFileByIdSubmit = useCallback(async () => {
        if (!fileIdInput.trim() || isAddingById || isLoading) return;
        setIsAddingById(true);
        justInitiatedFileOpRef.current = true;
        await onAddFileById(fileIdInput.trim());
        setIsAddingById(false);
        setFileIdInput('');
    }, [fileIdInput, isAddingById, isLoading, setIsAddingById, justInitiatedFileOpRef, onAddFileById, setFileIdInput]);

    const handleToggleToolAndFocus = useCallback((toggleFunc: () => void) => {
        toggleFunc();
        setTimeout(() => textareaRef.current?.focus(), 0);
    }, [textareaRef]);

    const handleSaveFileConfig = useCallback((fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => {
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    }, [setSelectedFiles]);

    // Derived Navigation State
    const inputImages = previewFile 
        ? selectedFiles.filter(f => (SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml') && !f.error)
        : [];
    
    const currentImageIndex = previewFile 
        ? inputImages.findIndex(f => f.id === previewFile.id)
        : -1;

    const handlePrevImage = useCallback(() => {
        if (currentImageIndex > 0) {
            setPreviewFile(inputImages[currentImageIndex - 1]);
        }
    }, [currentImageIndex, inputImages, setPreviewFile]);

    const handleNextImage = useCallback(() => {
        if (currentImageIndex < inputImages.length - 1) {
            setPreviewFile(inputImages[currentImageIndex + 1]);
        }
    }, [currentImageIndex, inputImages, setPreviewFile]);

    return {
        handleFileChange,
        handleFolderChange,
        handleZipChange,
        handleAddUrl,
        handlePaste,
        handleInputChange,
        handleSubmit,
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
    };
};