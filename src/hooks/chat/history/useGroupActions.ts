
import { useCallback } from 'react';
import { ChatGroup, SavedChatSession } from '../../../types';
import { logService } from '../../../utils/appUtils';

interface UseGroupActionsProps {
    updateAndPersistGroups: (updater: (prev: ChatGroup[]) => ChatGroup[]) => Promise<void>;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
    t: (key: string, fallback?: string) => string;
}

export const useGroupActions = ({
    updateAndPersistGroups,
    updateAndPersistSessions,
    t
}: UseGroupActionsProps) => {

    const handleAddNewGroup = useCallback(() => {
        logService.info('Adding new group.');
        const newGroup: ChatGroup = {
            id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: t('newGroup_title', 'Untitled'),
            timestamp: Date.now(),
            isExpanded: true,
        };
        updateAndPersistGroups(prev => [newGroup, ...prev]);
    }, [updateAndPersistGroups, t]);

    const handleDeleteGroup = useCallback((groupId: string) => {
        logService.info(`Deleting group: ${groupId}`);
        updateAndPersistGroups(prev => prev.filter(g => g.id !== groupId));
        updateAndPersistSessions(prev => prev.map(s => s.groupId === groupId ? { ...s, groupId: null } : s));
    }, [updateAndPersistGroups, updateAndPersistSessions]);

    const handleRenameGroup = useCallback((groupId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        logService.info(`Renaming group ${groupId} to "${newTitle}"`);
        updateAndPersistGroups(prev => prev.map(g => g.id === groupId ? { ...g, title: newTitle.trim() } : g));
    }, [updateAndPersistGroups]);
    
    const handleMoveSessionToGroup = useCallback((sessionId: string, groupId: string | null) => {
        logService.info(`Moving session ${sessionId} to group ${groupId}`);
        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, groupId } : s));
    }, [updateAndPersistSessions]);

    const handleToggleGroupExpansion = useCallback((groupId: string) => {
        updateAndPersistGroups(prev => prev.map(g => g.id === groupId ? { ...g, isExpanded: !(g.isExpanded ?? true) } : g));
    }, [updateAndPersistGroups]);

    return {
        handleAddNewGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleMoveSessionToGroup,
        handleToggleGroupExpansion
    };
};
