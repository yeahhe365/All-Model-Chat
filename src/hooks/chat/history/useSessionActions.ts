import { useCallback } from 'react';
import { SavedChatSession } from '../../../types';
import { logService } from '../../../services/logService';
import { generateUniqueId } from '../../../utils/chat/ids';
import { createNewSession } from '../../../utils/chat/session';
import { cleanupFilePreviewUrls } from '../../../utils/fileHelpers';
import { dbService } from '../../../utils/db';
import { removeSessionScopedLocalStorageEntries } from '../../../utils/sessionLocalStorage';

interface UseSessionActionsProps {
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void | Promise<void>;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useSessionActions = ({ updateAndPersistSessions, activeJobs }: UseSessionActionsProps) => {
  const handleDeleteChatHistorySession = useCallback(
    (sessionId: string) => {
      logService.info(`Deleting session: ${sessionId}`);

      // --- Fix: LocalStorage fragmentation & infinite growth ---
      // 精准清理特定 session 的 LocalStorage 缓存
      try {
        removeSessionScopedLocalStorageEntries([sessionId]);
      } catch (e) {
        console.error('Failed to clean up session localStorage:', e);
      }
      // ---------------------------------------------------------

      updateAndPersistSessions((prev) => {
        const sessionToDelete = prev.find((s) => s.id === sessionId);
        if (sessionToDelete) {
          // Abort active jobs for this session
          sessionToDelete.messages.forEach((msg) => {
            if (msg.isLoading && activeJobs.current.has(msg.id)) {
              activeJobs.current.get(msg.id)?.abort();
              activeJobs.current.delete(msg.id);
            }
            // Explicitly cleanup file blobs to prevent leaks
            cleanupFilePreviewUrls(msg.files);
          });
        }
        return prev.filter((s) => s.id !== sessionId);
      });
    },
    [updateAndPersistSessions, activeJobs],
  );

  const handleRenameSession = useCallback(
    (sessionId: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      logService.info(`Renaming session ${sessionId} to "${newTitle}"`);
      updateAndPersistSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s)));
    },
    [updateAndPersistSessions],
  );

  const handleTogglePinSession = useCallback(
    (sessionId: string) => {
      logService.info(`Toggling pin for session ${sessionId}`);
      updateAndPersistSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s)));
    },
    [updateAndPersistSessions],
  );

  const handleDuplicateSession = useCallback(
    async (sessionId: string) => {
      logService.info(`Duplicating session: ${sessionId}`);
      const persistedSession = await dbService.getSession(sessionId);

      updateAndPersistSessions((prev) => {
        const sessionToDuplicate = prev.find((s) => s.id === sessionId);
        if (!sessionToDuplicate) return prev;
        const fullSessionToDuplicate =
          sessionToDuplicate.messages.length > 0 ? sessionToDuplicate : (persistedSession ?? sessionToDuplicate);

        const duplicatedMessages = fullSessionToDuplicate.messages.map((message) => ({
          ...message,
          id: generateUniqueId(),
          files: message.files?.map((file) => ({
            ...file,
            id: generateUniqueId(),
          })),
          isLoading: false,
          generationStartTime: undefined,
          generationEndTime: undefined,
        }));

        const newSession = createNewSession(
          fullSessionToDuplicate.settings,
          duplicatedMessages,
          `${fullSessionToDuplicate.title} (Copy)`,
        );
        return [newSession, ...prev];
      });
    },
    [updateAndPersistSessions],
  );

  return {
    handleDeleteChatHistorySession,
    handleRenameSession,
    handleTogglePinSession,
    handleDuplicateSession,
  };
};
