// hooks/useSuggestions.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings } from '../types';
import { getKeyForRequest, logService } from '../utils/appUtils';
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
        // Show loading state
        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: true} : m)
        } : s));

        // Use skipIncrement: true to avoid rotating API keys for background suggestions
        const keyResult = getKeyForRequest(appSettings, sessionSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            logService.error('Cannot generate suggestions: API key not configured.');
            // Hide loading state on error
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
            } : s));
            return;
        }

        try {
            const suggestions = await geminiServiceInstance.generateSuggestions(keyResult.key, userContent, modelContent, language);
            if (suggestions && suggestions.length > 0) {
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? {...m, suggestions, isGeneratingSuggestions: false} : m)
                } : s));
            } else {
                 // Hide loading state if no suggestions are returned
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
                } : s));
            }
        } catch (error) {
            logService.error('Suggestion generation failed in handler', { error });
             // Hide loading state on error
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s, messages: s.messages.map(m => m.id === messageId ? {...m, isGeneratingSuggestions: false} : m)
            } : s));
        }
    }, [appSettings, language, updateAndPersistSessions]);

    useEffect(() => {
        // Trigger condition: loading just finished for the active chat
        if (prevIsLoadingRef.current && !isLoading && appSettings.isSuggestionsEnabled && activeChat) {
            const { messages, id: sessionId, settings } = activeChat;
            if (messages.length < 2) return;

            const lastMessage = messages[messages.length - 1];
            const secondLastMessage = messages[messages.length - 2];

            // Condition: The last turn was a user message followed by a model response,
            // and we haven't already fetched suggestions for it.
            if (
                lastMessage.role === 'model' &&
                !lastMessage.isLoading &&
                secondLastMessage.role === 'user' &&
                !lastMessage.suggestions &&
                lastMessage.isGeneratingSuggestions === undefined // Check undefined to prevent re-triggering
            ) {
                // Generate suggestions for the completed turn
                generateAndAttachSuggestions(sessionId, lastMessage.id, secondLastMessage.content, lastMessage.content, settings);
            }
        }
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, activeChat, appSettings.isSuggestionsEnabled, generateAndAttachSuggestions]);
};