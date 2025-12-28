
import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '../useDevice';

export const INITIAL_TEXTAREA_HEIGHT_PX = 28;
export const MAX_TEXTAREA_HEIGHT_PX = 150;

export const useChatInputState = (activeSessionId: string | null, isEditing: boolean) => {
    const [inputText, setInputText] = useState('');
    const [quoteText, setQuoteText] = useState('');
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
        // Height adjustment is now handled reactively within ChatTextArea component
        // utilizing a shadow DOM element for smooth transitions.
    }, []);

    // Load draft from localStorage when session changes
    useEffect(() => {
        if (activeSessionId && !isEditing) {
            const draftKey = `chatDraft_${activeSessionId}`;
            const savedDraft = localStorage.getItem(draftKey);
            setInputText(savedDraft || '');
            setQuoteText(''); // Reset quote on session change
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

    const handleToggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => {
            const newState = !prev;
            if (newState) {
                // Entering fullscreen, we want to focus.
                setTimeout(() => textareaRef.current?.focus(), 50);
            }
            return newState;
        });
    }, []);

    return {
        inputText, setInputText,
        quoteText, setQuoteText,
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
