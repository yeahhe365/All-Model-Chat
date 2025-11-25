
import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from './useDevice';

export const INITIAL_TEXTAREA_HEIGHT_PX = 28;
export const MAX_TEXTAREA_HEIGHT_PX = 150;

export const useChatInputState = (activeSessionId: string | null, isEditing: boolean) => {
    const [inputText, setInputText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isAnimatingSend, setIsAnimatingSend] = useState(false);
    const [fileIdInput, setFileIdInput] = useState('');
    const [isAddingById, setIsAddingById] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isAddingByUrl, setIsAddingByUrl] = useState(false);
    const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const justInitiatedFileOpRef = useRef(false);
    const prevIsProcessingFileRef = useRef(false);
    const isComposingRef = useRef(false);

    const isMobile = useIsMobile();

    const adjustTextareaHeight = useCallback(() => {
        if (isFullscreen) return; // Do not adjust height in fullscreen mode
        const target = textareaRef.current;
        if (!target) return;
        // Use isMobile hook for reactive resizing instead of one-off calculation
        const currentInitialHeight = isMobile ? 24 : INITIAL_TEXTAREA_HEIGHT_PX;
        target.style.height = 'auto';
        const scrollHeight = target.scrollHeight;
        const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
        target.style.height = `${newHeight}px`;
    }, [isMobile, isFullscreen]);

    // Load draft from localStorage when session changes
    useEffect(() => {
        if (activeSessionId && !isEditing) {
            const draftKey = `chatDraft_${activeSessionId}`;
            const savedDraft = localStorage.getItem(draftKey);
            setInputText(savedDraft || '');
        }
    }, [activeSessionId, isEditing]);

    // Save draft to localStorage on input change (debounced)
    useEffect(() => {
        if (!activeSessionId) return;
        const handler = setTimeout(() => {
            const draftKey = `chatDraft_${activeSessionId}`;
            if (inputText.trim()) {
                localStorage.setItem(draftKey, inputText);
            } else {
                localStorage.removeItem(draftKey);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [inputText, activeSessionId]);

    const clearCurrentDraft = useCallback(() => {
        if (activeSessionId) {
            const draftKey = `chatDraft_${activeSessionId}`;
            localStorage.removeItem(draftKey);
        }
    }, [activeSessionId]);

    // Adjust height whenever input text changes
    useEffect(() => { adjustTextareaHeight(); }, [inputText, adjustTextareaHeight]);

    const handleToggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => {
            const newState = !prev;
            if (newState) {
                // Entering fullscreen, we want to focus. Height is handled by CSS.
                setTimeout(() => textareaRef.current?.focus(), 50);
            } else {
                // Exiting fullscreen, need to reset height calculation
                setTimeout(() => adjustTextareaHeight(), 0);
            }
            return newState;
        });
    }, [adjustTextareaHeight]);

    return {
        inputText, setInputText,
        isTranslating, setIsTranslating,
        isAnimatingSend, setIsAnimatingSend,
        fileIdInput, setFileIdInput,
        isAddingById, setIsAddingById,
        urlInput, setUrlInput,
        isAddingByUrl, setIsAddingByUrl,
        isWaitingForUpload, setIsWaitingForUpload,
        isFullscreen, setIsFullscreen,
        textareaRef,
        justInitiatedFileOpRef,
        prevIsProcessingFileRef,
        isComposingRef,
        adjustTextareaHeight,
        clearCurrentDraft,
        handleToggleFullscreen,
        isMobile
    };
};
