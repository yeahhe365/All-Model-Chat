
import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '../useDevice';

export const INITIAL_TEXTAREA_HEIGHT_PX = 28;
export const MAX_TEXTAREA_HEIGHT_PX = 150;

export const useChatInputState = (activeSessionId: string | null, isEditing: boolean) => {
    const [inputText, setInputText] = useState('');
    const [quotes, setQuotes] = useState<string[]>([]);
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

    // Load draft from localStorage when session changes
    useEffect(() => {
        if (activeSessionId && !isEditing) {
            const draftKey = `chatDraft_${activeSessionId}`;
            const savedDraft = localStorage.getItem(draftKey);
            setInputText(savedDraft || '');
            
            // Load quotes draft
            const quoteKey = `chatQuotes_${activeSessionId}`;
            try {
                const savedQuotes = localStorage.getItem(quoteKey);
                if (savedQuotes) {
                    const parsed = JSON.parse(savedQuotes);
                    if (Array.isArray(parsed)) {
                        setQuotes(parsed);
                    }
                } else {
                    setQuotes([]);
                }
            } catch (e) {
                setQuotes([]);
            }
        }
    }, [activeSessionId, isEditing]);

    // Cross-Tab Sync for Input Drafts
    useEffect(() => {
        if (!activeSessionId || isEditing) return;

        const draftKey = `chatDraft_${activeSessionId}`;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === draftKey) {
                // If another tab updated the draft for the SAME session, sync it here.
                const newValue = e.newValue || '';
                // Only update if different to avoid cursor jumping loops if this tab is active
                if (newValue !== inputText) {
                    setInputText(newValue);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [activeSessionId, isEditing, inputText]);

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

    // Save quotes to localStorage
    useEffect(() => {
        if (!activeSessionId) return;
        const quoteKey = `chatQuotes_${activeSessionId}`;
        if (quotes.length > 0) {
            localStorage.setItem(quoteKey, JSON.stringify(quotes));
        } else {
            localStorage.removeItem(quoteKey);
        }
    }, [quotes, activeSessionId]);

    const clearCurrentDraft = useCallback(() => {
        if (activeSessionId) {
            localStorage.removeItem(`chatDraft_${activeSessionId}`);
            localStorage.removeItem(`chatQuotes_${activeSessionId}`);
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
        quotes, setQuotes,
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
        clearCurrentDraft,
        handleToggleFullscreen,
        isMobile
    };
};
