
import { useEffect, useRef, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings } from '../types';
import { getKeyForRequest, logService, getActiveApiConfig } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface SuggestionsProps {
    appSettings: AppSettings;
    activeChat: SavedChatSession | undefined;
    isLoading: boolean;
    updateAndPersistSessions: SessionsUpdater;
    language: 'en' | 'zh';
}

export const useSuggestions = ({
    appSettings,
    activeChat,
    isLoading,
    updateAndPersistSessions,
    language,
}: SuggestionsProps) => {
    const prevIsLoadingRef = useRef(isLoading);

    const generateAndAttachSuggestions = useCallback(async (sessionId: string, messageId: string, userContent: string, modelContent: string, sessionSettings: IndividualChatSettings) => {
        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: true} : m)
        } : s));

        const keyResult = getKeyForRequest(appSettings, sessionSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            logService.error('Cannot generate suggestions: API key not configured.');
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
            } : s));
            return;
        }
        
        const { baseUrl } = getActiveApiConfig(appSettings);

        try {
            const suggestions = await geminiServiceInstance.generateSuggestions(keyResult.key, userContent, modelContent, language, baseUrl);
            if (suggestions && suggestions.length > 0) {
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? {...m, suggestions, isGeneratingSuggestions: false} : m)
                } : s));
            } else {
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
                } : s));
            }
        } catch (error) {
            logService.error('Suggestion generation failed in handler', { error });
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
            } : s));
        }
    }, [appSettings, language, updateAndPersistSessions]);

    useEffect(() => {
        if (prevIsLoadingRef.current && !isLoading && appSettings.isSuggestionsEnabled && activeChat) {
            const { messages, id: sessionId, settings } = activeChat;
            if (messages.length < 2) return;

            const lastMessage = messages[messages.length - 1];
            const secondLastMessage = messages[messages.length - 2];

            if (
                lastMessage.role === 'model' &&
                !lastMessage.isLoading &&
                !lastMessage.stoppedByUser && 
                secondLastMessage.role === 'user' &&
                !lastMessage.suggestions &&
                lastMessage.isGeneratingSuggestions === undefined 
            ) {
                generateAndAttachSuggestions(sessionId, lastMessage.id, secondLastMessage.content, lastMessage.content, settings);
            }
        }
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, activeChat, appSettings.isSuggestionsEnabled, generateAndAttachSuggestions]);
};
