
import { useCallback, useEffect } from 'react';
import { AppSettings, SavedChatSession } from '../types';
import { getKeyForRequest, logService, generateSessionTitle } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface AutoTitlingProps {
    appSettings: AppSettings;
    savedSessions: SavedChatSession[];
    updateAndPersistSessions: SessionsUpdater;
    language: 'en' | 'zh';
    generatingTitleSessionIds: Set<string>;
    setGeneratingTitleSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useAutoTitling = ({
    appSettings,
    savedSessions,
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

        // Use skipIncrement to avoid rotating keys for background title generation
        const keyResult = getKeyForRequest(appSettings, session.settings, { skipIncrement: true });
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
            // Fallback to local generation to prevent infinite retry loops on "New Chat"
            const localTitle = generateSessionTitle(messages);
            if (localTitle && localTitle !== 'New Chat') {
                updateAndPersistSessions(prev =>
                    prev.map(s => (s.id === sessionId ? { ...s, title: localTitle } : s))
                );
            }
        } finally {
            setGeneratingTitleSessionIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        }
    }, [appSettings, updateAndPersistSessions, language, setGeneratingTitleSessionIds]);

    useEffect(() => {
        if (!appSettings.isAutoTitleEnabled) return;

        const candidates = savedSessions.filter(session => {
            // Only title "New Chat" sessions
            if (session.title !== 'New Chat') return false;
            
            // Skip if already generating
            if (generatingTitleSessionIds.has(session.id)) return false;
            
            // Need at least user prompt and model response
            if (session.messages.length < 2) return false;
            
            const firstMsg = session.messages[0];
            const secondMsg = session.messages[1];

            // Basic structure check
            if (firstMsg.role !== 'user' || secondMsg.role !== 'model') return false;

            // Wait for the first model message to be complete
            if (secondMsg.isLoading || secondMsg.stoppedByUser) return false;

            return true;
        });

        candidates.forEach(session => {
            generateTitleForSession(session);
        });

    }, [savedSessions, appSettings.isAutoTitleEnabled, generatingTitleSessionIds, generateTitleForSession]);

};
