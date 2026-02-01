
import { useCallback } from 'react';
import { SavedChatSession } from '../../../types';
import { createNewSession, logService, cleanupFilePreviewUrls } from '../../../utils/appUtils';

interface UseSessionActionsProps {
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useSessionActions = ({
    updateAndPersistSessions,
    activeJobs
}: UseSessionActionsProps) => {

    const handleDeleteChatHistorySession = useCallback((sessionId: string) => {
        logService.info(`Deleting session: ${sessionId}`);
        updateAndPersistSessions(prev => {
             const sessionToDelete = prev.find(s => s.id === sessionId);
             if (sessionToDelete) {
                 // Abort active jobs for this session
                 sessionToDelete.messages.forEach(msg => {
                     if(msg.isLoading && activeJobs.current.has(msg.id)) {
                         activeJobs.current.get(msg.id)?.abort();
                         activeJobs.current.delete(msg.id);
                     }
                     // Explicitly cleanup file blobs to prevent leaks
                     cleanupFilePreviewUrls(msg.files);
                 });
             }
             return prev.filter(s => s.id !== sessionId);
        });
    }, [updateAndPersistSessions, activeJobs]);
    
    const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        logService.info(`Renaming session ${sessionId} to "${newTitle}"`);
        updateAndPersistSessions(prev =>
            prev.map(s => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
        );
    }, [updateAndPersistSessions]);

    const handleTogglePinSession = useCallback((sessionId: string) => {
        logService.info(`Toggling pin for session ${sessionId}`);
        updateAndPersistSessions(prev =>
            prev.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s)
        );
    }, [updateAndPersistSessions]);

    const handleDuplicateSession = useCallback((sessionId: string) => {
        logService.info(`Duplicating session: ${sessionId}`);
        updateAndPersistSessions(prev => {
            const sessionToDuplicate = prev.find(s => s.id === sessionId);
            if (!sessionToDuplicate) return prev;

            const newSession = createNewSession(
                sessionToDuplicate.settings,
                sessionToDuplicate.messages.map(m => ({
                    ...m,
                    id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    isLoading: false,
                    generationStartTime: undefined,
                    generationEndTime: undefined
                })),
                `${sessionToDuplicate.title} (Copy)`
            );
            return [newSession, ...prev];
        });
    }, [updateAndPersistSessions]);

    return {
        handleDeleteChatHistorySession,
        handleRenameSession,
        handleTogglePinSession,
        handleDuplicateSession
    };
};