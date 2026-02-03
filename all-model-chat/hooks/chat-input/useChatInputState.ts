import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '../useDevice';

export const INITIAL_TEXTAREA_HEIGHT_PX = 28;
export const MAX_TEXTAREA_HEIGHT_PX = 150;

export const useChatInputState = (activeSessionId: string | null, isEditing: boolean) => {
    const [inputText, setInputText] = useState('');
    const [quotes, setQuotes] = useState<string[]>([]);
    const [ttsContext, setTtsContext] = useState('');
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

            // Load TTS Context draft
            const ttsKey = `chatTtsContext_${activeSessionId}`;
            const savedTtsContext = localStorage.getItem(ttsKey);
            setTtsContext(savedTtsContext || '');
        }
    }, [activeSessionId, isEditing]);

    // Cross-Tab Sync for Input Drafts
    useEffect(() => {
        if (!activeSessionId || isEditing) return;

        const draftKey = `chatDraft_${activeSessionId}`;
        const quoteKey = `chatQuotes_${activeSessionId}`;
        const ttsKey = `chatTtsContext_${activeSessionId}`;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === draftKey) {
                const newValue = e.newValue || '';
                if (newValue !== inputText) {
                    setInputText(newValue);
                }
            } else if (e.key === quoteKey) {
                try {
                    const newValue = e.newValue ? JSON.parse(e.newValue) : [];
                    if (JSON.stringify(newValue) !== JSON.stringify(quotes)) {
                        setQuotes(newValue);
                    }
                } catch (e) {}
            } else if (e.key === ttsKey) {
                const newValue = e.newValue || '';
                if (newValue !== ttsContext) {
                    setTtsContext(newValue);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [activeSessionId, isEditing, inputText, quotes, ttsContext]);

    // Save draft to localStorage on input change (debounced)
    useEffect(() => {
        if (!activeSessionId || isEditing) return;
        const handler = setTimeout(() => {
            const draftKey = `chatDraft_${activeSessionId}`;
            if (inputText.trim()) {
                localStorage.setItem(draftKey, inputText);
            } else {
                localStorage.removeItem(draftKey);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [inputText, activeSessionId, isEditing]);

    // Save quotes to localStorage
    useEffect(() => {
        if (!activeSessionId || isEditing) return;
        const quoteKey = `chatQuotes_${activeSessionId}`;
        if (quotes.length > 0) {
            localStorage.setItem(quoteKey, JSON.stringify(quotes));
        } else {
            localStorage.removeItem(quoteKey);
        }
    }, [quotes, activeSessionId, isEditing]);

    // Save TTS context to localStorage
    useEffect(() => {
        if (!activeSessionId || isEditing) return;
        const ttsKey = `chatTtsContext_${activeSessionId}`;
        if (ttsContext.trim()) {
            localStorage.setItem(ttsKey, ttsContext);
        } else {
            localStorage.removeItem(ttsKey);
        }
    }, [ttsContext, activeSessionId, isEditing]);

    const clearCurrentDraft = useCallback(() => {
        if (activeSessionId) {
            localStorage.removeItem(`chatDraft_${activeSessionId}`);
            localStorage.removeItem(`chatQuotes_${activeSessionId}`);
            // Note: We deliberately do NOT clear TTS context on send, as it's often a persistent directive for the session
        }
    }, [activeSessionId]);

    const handleToggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => {
            const newState = !prev;
            if (newState) {
                setTimeout(() => textareaRef.current?.focus(), 50);
            }
            return newState;
        });
    }, []);

    return {
        inputText, setInputText,
        quotes, setQuotes,
        ttsContext, setTtsContext,
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