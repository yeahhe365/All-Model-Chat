import { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import { useIsMobile } from '../useDevice';
import {
  chatInputStateReducer,
  createSetChatInputFlagAction,
  createToggleChatInputFullscreenAction,
  initialChatInputMachineState,
  type ChatInputBooleanUpdate,
  type ChatInputMachineFlag,
} from './chatInputStateMachine';

export const INITIAL_TEXTAREA_HEIGHT_PX = 25.2;
export const MAX_TEXTAREA_HEIGHT_PX = 150;

export const useChatInputState = (activeSessionId: string | null, isEditing: boolean) => {
  const [inputText, setInputText] = useState('');
  const [quotes, setQuotes] = useState<string[]>([]);
  const [ttsContext, setTtsContext] = useState('');
  const [fileIdInput, setFileIdInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [machineState, dispatchMachineState] = useReducer(chatInputStateReducer, initialChatInputMachineState);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(false);
  const isComposingRef = useRef(false);

  const isMobile = useIsMobile();

  const setMachineFlag = useCallback((flag: ChatInputMachineFlag, value: ChatInputBooleanUpdate) => {
    dispatchMachineState(createSetChatInputFlagAction(flag, value));
  }, []);

  const setIsTranslating = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isTranslating', value),
    [setMachineFlag],
  );
  const setIsAnimatingSend = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isAnimatingSend', value),
    [setMachineFlag],
  );
  const setIsAddingById = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isAddingById', value),
    [setMachineFlag],
  );
  const setIsAddingByUrl = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isAddingByUrl', value),
    [setMachineFlag],
  );
  const setIsWaitingForUpload = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isWaitingForUpload', value),
    [setMachineFlag],
  );
  const setIsFullscreen = useCallback(
    (value: ChatInputBooleanUpdate) => setMachineFlag('isFullscreen', value),
    [setMachineFlag],
  );

  // Load draft from localStorage when session changes
  useEffect(() => {
    if (activeSessionId && !isEditing) {
      const draftKey = `chatDraft_${activeSessionId}`;
      const savedDraft = localStorage.getItem(draftKey);
      // Intentional draft hydration when switching sessions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      } catch {
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
        } catch {
          // Ignore malformed cross-tab quote payloads.
        }
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
    if (!machineState.isFullscreen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }

    dispatchMachineState(createToggleChatInputFullscreenAction());
  }, [machineState.isFullscreen]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  return {
    inputText,
    setInputText,
    quotes,
    setQuotes,
    ttsContext,
    setTtsContext,
    machineState,
    isTranslating: machineState.isTranslating,
    setIsTranslating,
    isAnimatingSend: machineState.isAnimatingSend,
    setIsAnimatingSend,
    fileIdInput,
    setFileIdInput,
    isAddingById: machineState.isAddingById,
    setIsAddingById,
    urlInput,
    setUrlInput,
    isAddingByUrl: machineState.isAddingByUrl,
    setIsAddingByUrl,
    isWaitingForUpload: machineState.isWaitingForUpload,
    setIsWaitingForUpload,
    isFullscreen: machineState.isFullscreen,
    setIsFullscreen,
    textareaRef,
    justInitiatedFileOpRef,
    prevIsProcessingFileRef,
    isComposingRef,
    handleCompositionStart,
    handleCompositionEnd,
    clearCurrentDraft,
    handleToggleFullscreen,
    isMobile,
  };
};
