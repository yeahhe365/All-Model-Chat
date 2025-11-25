
import { useState, useEffect, useMemo } from 'react';
import { Chat } from '@google/genai';
import { AppSettings, ChatSettings, SavedChatSession } from '../types';
import { getKeyForRequest, logService, createChatHistoryForApi } from '../utils/appUtils';
import { getApiClient, buildGenerationConfig } from '../services/api/baseApi';
import { dbService } from '../utils/db';

interface UseChatClientProps {
    activeSessionId: string | null;
    savedSessions: SavedChatSession[];
    appSettings: AppSettings;
    currentChatSettings: ChatSettings;
    messages: any[]; // Used for dependency tracking
    aspectRatio: string;
    imageSize: string;
}

export const useChatClient = ({
    activeSessionId,
    savedSessions,
    appSettings,
    currentChatSettings,
    messages,
    aspectRatio,
    imageSize
}: UseChatClientProps) => {
    const [chat, setChat] = useState<Chat | null>(null);

    // Memoize stable dependencies to prevent unnecessary Chat object re-creation
    const nonLoadingMessageCount = useMemo(() => messages.filter(m => !m.isLoading).length, [messages]);
    
    const {
        modelId,
        systemInstruction,
        temperature,
        topP,
        showThoughts,
        thinkingBudget,
        thinkingLevel,
        isGoogleSearchEnabled,
        isCodeExecutionEnabled,
        isUrlContextEnabled,
        isDeepSearchEnabled,
        lockedApiKey,
    } = currentChatSettings;

    useEffect(() => {
        const activeSession = savedSessions.find(s => s.id === activeSessionId);
        if (!activeSession) {
            setChat(null);
            return;
        }

        const initializeChat = async () => {
            const keyResult = getKeyForRequest(appSettings, activeSession.settings);
            if ('error' in keyResult) {
                logService.error("Could not create chat object: API Key not configured.");
                setChat(null);
                return;
            }
            
            const storedSettings = await dbService.getAppSettings();
            const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
            const ai = getApiClient(keyResult.key, apiProxyUrl);
            
            // Use only non-loading messages for history when creating the object
            // This makes the history stable during a streaming response.
            const historyForChat = await createChatHistoryForApi(
                activeSession.messages.filter(m => !m.isLoading)
            );

            const modelIdToUse = activeSession.settings.modelId || appSettings.modelId;
            const newChat = ai.chats.create({
                model: modelIdToUse,
                history: historyForChat,
                config: buildGenerationConfig(
                    modelIdToUse,
                    activeSession.settings.systemInstruction,
                    { temperature: activeSession.settings.temperature, topP: activeSession.settings.topP },
                    activeSession.settings.showThoughts,
                    activeSession.settings.thinkingBudget,
                    activeSession.settings.isGoogleSearchEnabled,
                    activeSession.settings.isCodeExecutionEnabled,
                    activeSession.settings.isUrlContextEnabled,
                    activeSession.settings.thinkingLevel,
                    aspectRatio, 
                    activeSession.settings.isDeepSearchEnabled,
                    imageSize 
                )
            });
            setChat(newChat);
            logService.info(`Chat object initialized/updated for session ${activeSessionId} with model ${modelIdToUse}`);
        };

        initializeChat();
    }, [
        activeSessionId, 
        appSettings, 
        nonLoadingMessageCount, // Stable during stream, changes on delete/completion
        modelId,
        systemInstruction,
        temperature,
        topP,
        showThoughts,
        thinkingBudget,
        thinkingLevel,
        isGoogleSearchEnabled,
        isCodeExecutionEnabled,
        isUrlContextEnabled,
        isDeepSearchEnabled,
        lockedApiKey,
        aspectRatio,
        imageSize,
        // savedSessions is purposely omitted to avoid cycles, activeSession lookup inside effect handles it
    ]);

    return { chat };
};
