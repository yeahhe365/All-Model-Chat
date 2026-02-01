
import { useCallback, Dispatch, SetStateAction } from 'react';
import { SavedChatSession, ChatGroup } from '../../../types';
import { dbService } from '../../../utils/db';
import { logService, cleanupFilePreviewUrls } from '../../../utils/appUtils';

interface UseHistoryClearerProps {
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    startNewChat: () => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useHistoryClearer = ({
    setSavedSessions,
    setSavedGroups,
    startNewChat,
    activeJobs
}: UseHistoryClearerProps) => {

    const clearAllHistory = useCallback(() => {
        logService.warn('User clearing all chat history.');
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        
        // Cleanup all blobs before clearing state
        setSavedSessions(prevSessions => {
            prevSessions.forEach(session => {
                session.messages.forEach(msg => cleanupFilePreviewUrls(msg.files));
            });
            return [];
        });

        Promise.all([dbService.setAllSessions([]), dbService.setAllGroups([]), dbService.setActiveSessionId(null)]);
        setSavedGroups([]);
        startNewChat();
    }, [setSavedSessions, setSavedGroups, startNewChat, activeJobs]);
    
    const clearCacheAndReload = useCallback(() => {
        logService.warn('User clearing all application cache and settings.');
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        dbService.clearAllData();
        setTimeout(() => window.location.reload(), 50);
    }, [activeJobs]);

    return {
        clearAllHistory,
        clearCacheAndReload
    };
};