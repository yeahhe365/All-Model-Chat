import { useCallback, Dispatch, SetStateAction } from 'react';
import { SavedChatSession, ChatGroup } from '../../../types';
import { dbService } from '../../../utils/db';
import { logService, cleanupFilePreviewUrls } from '../../../utils/appUtils';
import { removeSessionScopedLocalStorageEntries } from '../../../utils/sessionLocalStorage';

interface UseHistoryClearerProps {
    savedSessions: SavedChatSession[];
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    startNewChat: () => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useHistoryClearer = ({
    savedSessions,
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
        savedSessions.forEach(session => {
            session.messages.forEach(msg => {
                cleanupFilePreviewUrls(msg.files);
            });
        });

        // --- Fix: LocalStorage fragmentation & infinite growth ---
        // 清理所有 localStorage 中的会话状态缓存
        try {
            removeSessionScopedLocalStorageEntries(savedSessions.map(session => session.id));
            logService.info(`Cleaned up session-scoped LocalStorage entries for ${savedSessions.length} sessions.`);
        } catch (e) {
            console.error("Failed to clean up localStorage:", e);
        }
        // ---------------------------------------------------------

        Promise.all([dbService.setAllSessions([]), dbService.setAllGroups([]), dbService.setActiveSessionId(null)]);
        setSavedSessions([]);
        setSavedGroups([]);
        startNewChat();
    }, [savedSessions, setSavedSessions, setSavedGroups, startNewChat, activeJobs]);
    
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
