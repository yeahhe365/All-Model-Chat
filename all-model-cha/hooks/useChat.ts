import { useEffect, useCallback } from 'react';
import { AppSettings, ChatHistoryItem, ChatSettings as IndividualChatSettings, SavedScenario } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { createChatHistoryForApi, generateUniqueId } from '../utils/appUtils';
import { APP_SETTINGS_KEY, PRELOADED_SCENARIO_KEY, CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';

import { useModels } from './useModels';
import { useChatState } from './useChatState';
import { useFileHandling } from './useFileHandling';
import { useChatHistory } from './useChatHistory';
import { usePreloadedScenarios } from './usePreloadedScenarios';
import { useMessageHandler } from './useMessageHandler';

export const useChat = (appSettings: AppSettings) => {
    // 1. Central state management
    const state = useChatState();
    const { 
        messages, setMessages,
        isLoading,
        currentChatSettings, setCurrentChatSettings,
        isSwitchingModel, setIsSwitchingModel,
        userScrolledUp,
        messagesEndRef,
        scrollContainerRef,
        sessionSaveTimeoutRef,
    } = state;

    // 2. Model fetching via custom hook
    const { apiModels, isModelsLoading, modelsLoadingError } = useModels(appSettings);
    
    // 3. History and Session Management
    const historyHandler = useChatHistory({ ...state, appSettings });
    const { activeSessionId, savedSessions, clearAllHistory } = historyHandler;

    // 4. File and Drag & Drop Management
    const fileHandler = useFileHandling({ ...state, appSettings });

    // 5. Preloaded Scenario Management
    const scenarioHandler = usePreloadedScenarios({ startNewChat: historyHandler.startNewChat, setMessages });
    
    // 6. Message Sending and Action Management
    const messageHandler = useMessageHandler({
        ...state,
        ...historyHandler,
        appSettings,
        activeSessionId
    });

    // Scrolling logic
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesEndRef]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) userScrolledUp.current = (container.scrollHeight - container.scrollTop - container.clientHeight) > 100;
    }, [scrollContainerRef, userScrolledUp]);

    useEffect(() => {
        if (!userScrolledUp.current) scrollToBottom();
    }, [messages, scrollToBottom, userScrolledUp]);

    // Effect to validate current model against available models
    useEffect(() => {
        if (!isModelsLoading && apiModels.length > 0) {
            const currentModelStillValid = apiModels.some(m => m.id === appSettings.modelId);
            if (!currentModelStillValid) {
                const preferredModelId = apiModels.find(m => m.isPinned)?.id || apiModels[0]?.id;
                if(preferredModelId) {
                    setCurrentChatSettings(prev => ({ ...prev, modelId: preferredModelId }));
                }
            }
        }
    }, [isModelsLoading, apiModels, appSettings.modelId, setCurrentChatSettings]);
    
    // UI Action Handlers
    const handleSelectModelInHeader = useCallback((modelId: string) => {
        if (isLoading && state.abortControllerRef.current) state.abortControllerRef.current.abort();
        if (modelId !== currentChatSettings.modelId) {
            setIsSwitchingModel(true);
            setCurrentChatSettings(prev => ({ ...prev, modelId: modelId }));
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId, setIsSwitchingModel, setCurrentChatSettings, userScrolledUp, state.abortControllerRef]);

    useEffect(() => {
        if (isSwitchingModel) {
            const timer = setTimeout(() => setIsSwitchingModel(false), 0);
            return () => clearTimeout(timer);
        }
    }, [isSwitchingModel, setIsSwitchingModel]);
    
    const handleClearCurrentChat = useCallback(() => {
        if (isLoading && state.abortControllerRef.current) {
            state.abortControllerRef.current.abort();
        }
        setMessages([]); 
        state.setInputText('');
        state.setSelectedFiles([]);
        state.setEditingMessageId(null);
        state.setAppFileError(null);
        userScrolledUp.current = false; 
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [isLoading, state.abortControllerRef, setMessages, state.setInputText, state.setSelectedFiles, state.setEditingMessageId, state.setAppFileError, userScrolledUp]);

    const clearCacheAndReload = useCallback(() => {
        // This function from useChatHistory handles clearing pending saves,
        // history-related localStorage, and resetting chat state.
        clearAllHistory();

        // Clear the remaining app-level settings.
        localStorage.removeItem(APP_SETTINGS_KEY);
        localStorage.removeItem(PRELOADED_SCENARIO_KEY);

        // A minimal delay to allow React to process state updates from `clearAllHistory`
        // before the page reloads. This helps ensure the save effect doesn't fire
        // with stale data right before reload.
        setTimeout(() => window.location.reload(), 50);

    }, [clearAllHistory]);


    return {
        ...state,
        ...fileHandler,
        ...historyHandler,
        ...scenarioHandler,
        ...messageHandler,
        savedSessions,
        activeSessionId,
        apiModels,
        isModelsLoading,
        modelsLoadingError,
        handleSelectModelInHeader,
        handleClearCurrentChat,
        clearCacheAndReload,
        handleScroll,
    };
};