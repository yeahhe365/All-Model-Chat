
import { useCallback, useRef, useEffect } from 'react';
import { SavedChatSession, ChatGroup, ChatMessage } from '../../../types';
import { dbService } from '../../../utils/db';
import { logService, rehydrateSessionFiles } from '../../../utils/appUtils';
import { useMultiTabSync } from '../../core/useMultiTabSync';

interface UseSessionPersistenceProps {
    setSavedSessions: React.Dispatch<React.SetStateAction<SavedChatSession[]>>;
    setSavedGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;
    setActiveMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setLoadingSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    activeSessionIdRef: React.MutableRefObject<string | null>;
    activeMessagesRef: React.MutableRefObject<ChatMessage[]>;
}

export const useSessionPersistence = ({
    setSavedSessions,
    setSavedGroups,
    setActiveMessages,
    setLoadingSessionIds,
    activeSessionIdRef,
    activeMessagesRef
}: UseSessionPersistenceProps) => {
    
    // Tracks session IDs that are generating *in this specific tab*
    const localLoadingSessionIds = useRef(new Set<string>());
    
    // Tracks if data became stale while the tab was hidden
    const isDirtyRef = useRef(false);

    const refreshSessions = useCallback(async () => {
        try {
            // Lazy Load Refresh: Get metadata for list
            const metadataList = await dbService.getAllSessionMetadata();
            
            // If we have an active session, ensure we have its latest FULL state
            if (activeSessionIdRef.current) {
                const fullActiveSession = await dbService.getSession(activeSessionIdRef.current);
                if (fullActiveSession) {
                    const rehydrated = rehydrateSessionFiles(fullActiveSession);
                    setActiveMessages(rehydrated.messages);
                }
            }

            const sortedList = metadataList.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
            
            setSavedSessions(sortedList);
        } catch (e) {
            logService.error("Failed to refresh sessions from DB", { error: e });
        }
    }, [setSavedSessions, setActiveMessages, activeSessionIdRef]);

    const refreshGroups = useCallback(async () => {
        try {
            const groups = await dbService.getAllGroups();
            setSavedGroups(groups);
        } catch (e) {
            logService.error("Failed to refresh groups from DB", { error: e });
        }
    }, [setSavedGroups]);

    // Re-sync when tab becomes visible if data is dirty
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isDirtyRef.current) {
                logService.info('[Sync] Tab visible, syncing pending updates from DB.');
                refreshSessions();
                refreshGroups();
                isDirtyRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [refreshSessions, refreshGroups]);

    const { broadcast } = useMultiTabSync({
        onSettingsUpdated: () => {
            if (document.hidden) {
                isDirtyRef.current = true;
                return;
            }
            refreshSessions();
        },
        onSessionsUpdated: () => {
            if (document.hidden) {
                isDirtyRef.current = true;
                return;
            }
            refreshSessions();
        },
        onGroupsUpdated: () => {
            if (document.hidden) {
                isDirtyRef.current = true;
                return;
            }
            refreshGroups();
        },
        onSessionContentUpdated: (id) => {
            // If THIS tab is currently streaming for this session, ignore update to avoid stutter
            if (localLoadingSessionIds.current.has(id)) {
                return;
            }

            if (document.hidden) {
                isDirtyRef.current = true;
                return;
            }

            // If the updated session is the active one, reload it fully. 
            if (id === activeSessionIdRef.current) {
                 dbService.getSession(id).then(s => {
                     if (s) {
                         const rehydrated = rehydrateSessionFiles(s);
                         setActiveMessages(rehydrated.messages);
                         // Also update metadata list to reflect title/timestamp changes
                         setSavedSessions(prev => prev.map(old => old.id === id ? { ...rehydrated, messages: [] } : old));
                     }
                 });
            } else {
                refreshSessions();
            }
        },
        onSessionLoading: (sessionId, isLoading) => {
            // Loading state is ephemeral and visual, we can skip it if hidden or let it update (low cost)
            // But usually we want to know if something is loading even if hidden (e.g. title/favicon updates?)
            // For now, we allow loading state updates as they don't hit DB.
            setLoadingSessionIds(prev => {
                const next = new Set(prev);
                if (isLoading) next.add(sessionId);
                else next.delete(sessionId);
                return next;
            });
        }
    });

    const setSessionLoading = useCallback((sessionId: string, isLoading: boolean) => {
        if (isLoading) {
            localLoadingSessionIds.current.add(sessionId);
        } else {
            localLoadingSessionIds.current.delete(sessionId);
        }

        setLoadingSessionIds(prev => {
            const next = new Set(prev);
            if (isLoading) next.add(sessionId);
            else next.delete(sessionId);
            return next;
        });

        broadcast({ type: 'SESSION_LOADING', sessionId, isLoading });
    }, [broadcast, setLoadingSessionIds]);

    // Core State Updater: Handles splitting messages (active) vs metadata (list)
    const updateAndPersistSessions = useCallback(async (
        updater: (prev: SavedChatSession[]) => SavedChatSession[],
        options: { persist?: boolean } = {}
    ) => {
        const { persist = true } = options;
        
        setSavedSessions(prevMetadataSessions => {
            const currentActiveId = activeSessionIdRef.current;
            const currentActiveMsgs = activeMessagesRef.current;

            // 1. Reconstruct "Virtual" Full State
            // Attach current active messages to the matching session in the list so the updater sees full state.
            const virtualFullSessions = prevMetadataSessions.map(s => {
                if (s.id === currentActiveId) {
                    return { ...s, messages: currentActiveMsgs };
                }
                return s;
            });

            // 2. Run Updater
            const newFullSessions = updater(virtualFullSessions);
            
            // 3. Sort
             newFullSessions.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });

            // 4. Update Active Messages State if changed
            // We check if the active session still exists and update its messages
            if (currentActiveId) {
                const newActiveSession = newFullSessions.find(s => s.id === currentActiveId);
                if (newActiveSession) {
                    // Update if reference changed (which it should if updater modified it)
                    if (newActiveSession.messages !== currentActiveMsgs) {
                        setActiveMessages(newActiveSession.messages);
                    }
                }
            }

            // 5. Persist
            if (persist) {
                 const updates: Promise<void>[] = [];
                 const newSessionsMap = new Map(newFullSessions.map(s => [s.id, s]));
                 const modifiedSessionIds: string[] = [];
                 
                 // Save changed sessions
                 newFullSessions.forEach(session => {
                     const prevSession = virtualFullSessions.find(ps => ps.id === session.id);
                     if (prevSession !== session) {
                         updates.push(dbService.saveSession(session));
                         modifiedSessionIds.push(session.id);
                     }
                 });

                 // Delete removed sessions
                 prevMetadataSessions.forEach(session => {
                     if (!newSessionsMap.has(session.id)) {
                         updates.push(dbService.deleteSession(session.id));
                     }
                 });

                 if (updates.length > 0) {
                     Promise.all(updates).then(() => {
                        if (modifiedSessionIds.length === 1) {
                            broadcast({ type: 'SESSION_CONTENT_UPDATED', sessionId: modifiedSessionIds[0] });
                        } else {
                            broadcast({ type: 'SESSIONS_UPDATED' });
                        }
                     }).catch(e => logService.error('Failed to persist session updates', { error: e }));
                 }
            }

            // 6. Return Metadata Only for `savedSessions` state
            // Strip messages to keep the list lightweight
            return newFullSessions.map(s => {
                // Optimized strip: avoid spread if messages is already empty (mostly true for inactive)
                if (s.messages && s.messages.length === 0) return s;
                const { messages, ...rest } = s;
                return { ...rest, messages: [] };
            });
        });
    }, [broadcast, activeSessionIdRef, activeMessagesRef, setSavedSessions, setActiveMessages]);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups)
                .then(() => broadcast({ type: 'GROUPS_UPDATED' }))
                .catch(e => logService.error('Failed to persist group updates', { error: e }));
            return newGroups;
        });
    }, [broadcast, setSavedGroups]);

    return {
        refreshSessions,
        refreshGroups,
        updateAndPersistSessions,
        updateAndPersistGroups,
        setSessionLoading
    };
};
