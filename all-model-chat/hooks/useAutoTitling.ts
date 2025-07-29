// hooks/useAutoTitling.ts
import { useCallback, useEffect } from 'react';
import { AppSettings, SavedChatSession } from '../types';
import { getKeyForRequest, logService } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface AutoTitlingProps {
    appSettings: AppSettings;
    activeChat: SavedChatSession | undefined;
    isLoading: boolean;
    updateAndPersistSessions: SessionsUpdater;
    language: 'en' | 'zh';
    generatingTitleSessionIds: Set<string>;
    setGeneratingTitleSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useAutoTitling = ({
    appSettings,
    activeChat,
    isLoading,
    updateAndPersistSessions,
    language,
    generatingTitleSessionIds,
    setGeneratingTitleSessionIds,
}: AutoTitlingProps) => {

    const generateTitleForSession = useCallback(async (session: SavedChatSession) => {
        const { id: sessionId, messages } = session;
        if (messages.length < 2) return;
        
        setGeneratingTitleSessionIds(prev => new Set(prev).add(sessionId));
        logService.info(`Auto-generating title for session ${sessionId}`);

        const keyResult = getKeyForRequest(appSettings, session.settings);
        if ('error' in keyResult) {
            logService.error(`Could not generate title for session ${sessionId}: ${keyResult.error}`);
            setGeneratingTitleSessionIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
            return;
        }

        try {
            const userContent = messages[0].content;
            const modelContent = messages[1].content;
            
            if (!userContent.trim() && !modelContent.trim()) {
                logService.info(`Skipping title generation for session ${sessionId} due to empty content.`);
                return;
            }
            
            const newTitle = await geminiServiceInstance.generateTitle(keyResult.key, userContent, modelContent, language);
            
            if (newTitle && newTitle.trim()) {
                logService.info(`Generated new title for session ${sessionId}: "${newTitle}"`);
                updateAndPersistSessions(prev =>
                    prev.map(s => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
                );
            } else {
                logService.warn(`Title generation for session ${sessionId} returned an empty string.`);
            }

        } catch (error) {
            logService.error(`Failed to auto-generate title for session ${sessionId}`, { error });
        } finally {
            setGeneratingTitleSessionIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        }
    }, [appSettings, updateAndPersistSessions, language, setGeneratingTitleSessionIds]);

    useEffect(() => {
        if (
            appSettings.isAutoTitleEnabled &&
            activeChat &&
            activeChat.messages.length === 2 &&
            !isLoading &&
            activeChat.title === 'New Chat' &&
            !generatingTitleSessionIds.has(activeChat.id)
        ) {
            const [userMessage, modelMessage] = activeChat.messages;
            if (userMessage.role === 'user' && modelMessage.role === 'model' && !modelMessage.isLoading) {
                generateTitleForSession(activeChat);
            }
        }
    }, [activeChat, isLoading, appSettings.isAutoTitleEnabled, generateTitleForSession, generatingTitleSessionIds]);

};
