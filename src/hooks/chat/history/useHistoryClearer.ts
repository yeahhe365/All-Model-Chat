import { useCallback, Dispatch, SetStateAction } from 'react';
import { SavedChatSession, ChatGroup } from '../../../types';
import { dbService } from '@/services/db/dbService';
import { logService } from '../../../services/logService';
import { cleanupFilePreviewUrls } from '../../../utils/fileHelpers';
import { removeSessionScopedLocalStorageEntries } from '../../../utils/sessionLocalStorage';
import { useChatDraftStore } from '../../../stores/chatDraftStore';

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
  activeJobs,
}: UseHistoryClearerProps) => {
  const clearAllHistory = useCallback(async () => {
    logService.warn('User clearing all chat history.');
    activeJobs.current.forEach((controller) => controller.abort());
    activeJobs.current.clear();

    await Promise.all([dbService.setAllSessions([]), dbService.setAllGroups([]), dbService.setActiveSessionId(null)]);

    // Cleanup all blobs only after persistence succeeds so a failed clear
    // does not leave the still-visible UI with revoked previews.
    savedSessions.forEach((session) => {
      session.messages.forEach((msg) => {
        cleanupFilePreviewUrls(msg.files);
      });
    });

    try {
      const sessionIds = savedSessions.map((session) => session.id);
      removeSessionScopedLocalStorageEntries(sessionIds);
      useChatDraftStore.getState().clearSessionDrafts(sessionIds);
      logService.info(`Cleaned up session-scoped LocalStorage entries for ${savedSessions.length} sessions.`);
    } catch (e) {
      console.error('Failed to clean up localStorage:', e);
    }

    setSavedSessions([]);
    setSavedGroups([]);
    startNewChat();
  }, [savedSessions, setSavedSessions, setSavedGroups, startNewChat, activeJobs]);

  const clearCacheAndReload = useCallback(async () => {
    logService.warn('User clearing all application cache and settings.');
    activeJobs.current.forEach((controller) => controller.abort());
    activeJobs.current.clear();
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }

    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      if (registrations?.length) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
    }

    try {
      const cacheKeys = await caches?.keys?.();
      if (cacheKeys?.length) {
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      }
    } catch (error) {
      console.error('Failed to clear CacheStorage:', error);
    }

    await dbService.clearAllData();
    setTimeout(() => window.location.reload(), 50);
  }, [activeJobs]);

  return {
    clearAllHistory,
    clearCacheAndReload,
  };
};
