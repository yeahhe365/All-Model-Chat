import { useEffect, useCallback } from 'react';
import { AppSettings, ChatHistoryItem, ChatSettings as IndividualChatSettings, SavedScenario } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { createChatHistoryForApi, generateUniqueId } from '../utils/appUtils';

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
        setChatSession,
        setIsSwitchingModel,
        userScrolledUp,
        messagesEndRef,
        scrollContainerRef,
    } = state;

    // 2. Model fetching via custom hook
    const { apiModels, isModelsLoading, modelsLoadingError } = useModels(appSettings);
    
    const initializeCurrentChatSession = useCallback(async (settingsToUse: IndividualChatSettings, history?: ChatHistoryItem[]) => {
        if (!settingsToUse.modelId) {
            const errorContent = 'No model selected. Cannot initialize chat.';
            setMessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].content === errorContent) return prev;
                return [...prev, { id: generateUniqueId(), role: 'error', content: errorContent, timestamp: new Date() }];
            });
            return null;
        }
        try {
            const newSession = await geminiServiceInstance.initializeChat(
                settingsToUse.modelId, settingsToUse.systemInstruction,
                { temperature: settingsToUse.temperature, topP: settingsToUse.topP },
                settingsToUse.showThoughts,
                settingsToUse.thinkingBudget,
                history
            );
            setChatSession(newSession);
            if (!newSession) {
                const errorContent = 'Failed to initialize chat session. Check API Key, network, and selected model.';
                setMessages(prev => {
                    if (prev.length > 0 && prev[prev.length - 1].content === errorContent) return prev;
                    return [...prev, { id: generateUniqueId(), role: 'error', content: errorContent, timestamp: new Date() }];
                });
            }
            return newSession;
        } catch (error) {
            if (error instanceof Error && error.name === 'SilentError') {
                setChatSession(null);
                return null;
            }
            console.error("Error initializing chat session:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            const fullErrorContent = `Error initializing chat: ${errorMsg}`;
            setMessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].content === fullErrorContent) {
                    return prev;
                }
                return [...prev, { id: generateUniqueId(), role: 'error', content: fullErrorContent, timestamp: new Date() }];
            });
            setChatSession(null);
            return null;
        }
    }, [setMessages, setChatSession]);

    // 3. History and Session Management
    const historyHandler = useChatHistory({ ...state, appSettings });
    const { activeSessionId, savedSessions, saveCurrentChatSession } = historyHandler;

    // 4. File and Drag & Drop Management
    const fileHandler = useFileHandling({ ...state });

    // 5. Preloaded Scenario Management
    const scenarioHandler = usePreloadedScenarios({ startNewChat: historyHandler.startNewChat, setMessages });
    
    // 6. Message Sending and Action Management
    const messageHandler = useMessageHandler({
        ...state,
        ...historyHandler,
        appSettings,
        initializeCurrentChatSession,
        saveCurrentChatSession,
        activeSessionId
    });

    // Scrolling logic
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

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
    
    // Chat session re-initialization
    useEffect(() => {
        const reinitializeIfNeeded = async () => {
            const modelId = currentChatSettings.modelId;
            const isTtsModel = modelId?.includes('-tts');
            const isImagenModel = modelId?.includes('imagen');
            const isVeoModel = modelId?.includes('veo-');

            if (!modelId || isTtsModel || isImagenModel || isVeoModel) {
                setChatSession(null); // No chat session for these models
                setIsSwitchingModel(false);
                return;
            }

            if (!activeSessionId && messages.length === 0) {
                await initializeCurrentChatSession(currentChatSettings, []);
            } else {
                await initializeCurrentChatSession(currentChatSettings, createChatHistoryForApi(messages));
            }
            setIsSwitchingModel(false);
        };
        reinitializeIfNeeded();
    }, [activeSessionId, currentChatSettings.modelId, currentChatSettings.systemInstruction, currentChatSettings.temperature, currentChatSettings.topP, currentChatSettings.showThoughts, currentChatSettings.thinkingBudget, messages, setChatSession, setIsSwitchingModel, initializeCurrentChatSession, currentChatSettings]);

    // UI Action Handlers
    const handleSelectModelInHeader = useCallback((modelId: string) => {
        if (isLoading && state.abortControllerRef.current) state.abortControllerRef.current.abort();
        if (modelId !== currentChatSettings.modelId) {
            setIsSwitchingModel(true);
            setCurrentChatSettings(prev => ({ ...prev, modelId: modelId }));
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId, setIsSwitchingModel, setCurrentChatSettings, userScrolledUp, state.abortControllerRef]);
    
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
        handleScroll,
    };
};