
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AppSettings, ChatGroup, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, InputCommand } from '../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../constants/appConstants';
import { dbService } from '../../utils/db';
import { logService, rehydrateSessionFiles } from '../../utils/appUtils';
import { useMultiTabSync } from '../core/useMultiTabSync';

export const useChatState = (appSettings: AppSettings) => {
    // savedSessions now primarily holds metadata (isPartial=true)
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    
    // We explicitly track the active chat object here to ensure we have full messages available
    const [activeChat, setActiveChat] = useState<SavedChatSession | undefined>(undefined);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'update' | 'resend'>('resend');
    const [commandedInput, setCommandedInput] = useState<InputCommand | null>(null);
    const [loadingSessionIds, setLoadingSessionIds] = useState(new Set<string>());
    const [generatingTitleSessionIds, setGeneratingTitleSessionIds] = useState(new Set<string>());
    const activeJobs = useRef(new Map<string, AbortController>());
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [appFileError, setAppFileError] = useState<string | null>(null);
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [imageSize, setImageSize] = useState<string>('1K');
    const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);
    const userScrolledUp = useRef<boolean>(false);
    const fileDraftsRef = useRef<Record<string, UploadedFile[]>>({});

    // Tracks session IDs that are generating *in this specific tab*.
    const localLoadingSessionIds = useRef(new Set<string>());

    // Sync active session ID to sessionStorage and URL
    useEffect(() => {
        if (activeSessionId) {
            try {
                sessionStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId);
            } catch (e) {}
            
            const targetPath = `/chat/${activeSessionId}`;
            try {
                if (window.location.pathname !== targetPath) {
                    window.history.pushState({ sessionId: activeSessionId }, '', targetPath);
                }
            } catch (e) {
                console.warn('Unable to update URL history:', e);
            }
        } else {
            try {
                sessionStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
            } catch (e) {}
            
            try {
                if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/chat/')) {
                     window.history.pushState({}, '', '/');
                }
            } catch (e) {
                console.warn('Unable to update URL history:', e);
            }
        }
    }, [activeSessionId]);

    // Keep activeChat in sync with activeSessionId from the list (if it was just created)
    useEffect(() => {
        if (activeSessionId && !activeChat) {
             const sessionInList = savedSessions.find(s => s.id === activeSessionId);
             // If we found it in the list AND it is NOT partial (it has messages), we can use it.
             // This happens when creating a new chat (which inserts a full object into savedSessions temporarily).
             if (sessionInList && !sessionInList.isPartial) {
                 setActiveChat(sessionInList);
             }
        }
    }, [activeSessionId, savedSessions, activeChat]);

    const refreshSessions = useCallback(async () => {
        try {
            // Lazy Load: Only fetch metadata to keep memory footprint low
            const sessions = await dbService.getAllSessionsMetadata();
            // Note: Metadata doesn't need rehydration of files since files are in messages
            sessions.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
            setSavedSessions(sessions);
        } catch (e) {
            logService.error("Failed to refresh sessions from DB", { error: e });
        }
    }, []);

    const refreshGroups = useCallback(async () => {
        try {
            const groups = await dbService.getAllGroups();
            setSavedGroups(groups);
        } catch (e) {
            logService.error("Failed to refresh groups from DB", { error: e });
        }
    }, []);

    const { broadcast } = useMultiTabSync({
        onSettingsUpdated: () => {
            refreshSessions();
        },
        onSessionsUpdated: () => {
            refreshSessions();
        },
        onGroupsUpdated: () => {
            refreshGroups();
        },
        onSessionContentUpdated: (id) => {
            // If THIS tab is currently generating content for this session, ignore DB updates to avoid stutter
            if (localLoadingSessionIds.current.has(id)) return;
            
            // If the updated session is the one we are viewing, we must reload it fully
            if (activeSessionId === id) {
                dbService.getSessionById(id).then(fullSession => {
                    if (fullSession) {
                        const rehydrated = rehydrateSessionFiles(fullSession);
                        setActiveChat(rehydrated);
                    }
                });
            }
            // Always refresh the sidebar list (metadata)
            refreshSessions();
        },
        onSessionLoading: (sessionId, isLoading) => {
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
    }, [broadcast]);

    const updateAndPersistSessions = useCallback(async (
        updater: (prev: SavedChatSession[]) => SavedChatSession[],
        options: { persist?: boolean } = {}
    ) => {
        const { persist = true } = options;
        
        // 1. Construct a temporary "view" of sessions that includes the full active chat
        //    This allows the updater function (which expects full objects) to work correctly on the active chat.
        let tempPreviousList = savedSessions;
        if (activeChat) {
             tempPreviousList = savedSessions.map(s => s.id === activeChat.id ? activeChat : s);
             // If active chat is new and not in savedSessions yet, append it?
             // Usually startNewChat adds it. If it's missing, we should probably add it to the temp list.
             if (!tempPreviousList.find(s => s.id === activeChat.id)) {
                 tempPreviousList = [activeChat, ...tempPreviousList];
             }
        }

        // 2. Run the updater
        const newSessionsFull = updater(tempPreviousList);
        
        // 3. Extract the new Active Chat state
        if (activeChat) {
            const updatedActive = newSessionsFull.find(s => s.id === activeChat.id);
            if (updatedActive) {
                // Update local state immediately
                setActiveChat(updatedActive);
            }
        } else {
             // Edge case: If we just created a new chat, we need to detect which one is active or was just added
             // The logic in useSessionLoader handles setting activeSessionId, so here we just sync if ID matches
             if (activeSessionId) {
                 const match = newSessionsFull.find(s => s.id === activeSessionId);
                 if (match) setActiveChat(match);
             }
        }

        // 4. Update the Sidebar List (Convert back to Metadata)
        //    We strip messages from all sessions to keep the sidebar list lightweight
        const newSessionsMetadata = newSessionsFull.map(s => {
             // If it's already partial, keep it. If it's full, strip it.
             if (s.isPartial) return s;
             // eslint-disable-next-line @typescript-eslint/no-unused-vars
             const { messages, ...meta } = s;
             return { ...meta, messages: [], isPartial: true };
        });

        // 5. Sort Metadata
        newSessionsMetadata.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.timestamp - a.timestamp;
        });

        setSavedSessions(newSessionsMetadata);
            
        if (persist) {
            const updates: Promise<void>[] = [];
            const newSessionsMap = new Map(newSessionsFull.map(s => [s.id, s]));
            const modifiedSessionIds: string[] = [];

            // Identify changes based on reference equality or ID existence
            // We compare against `tempPreviousList` which had the full active chat
            newSessionsFull.forEach(session => {
                const prevSession = tempPreviousList.find(s => s.id === session.id);
                if (prevSession !== session) {
                    // Smart save handles partial vs full automatically
                    updates.push(dbService.saveSession(session));
                    modifiedSessionIds.push(session.id);
                }
            });

            tempPreviousList.forEach(session => {
                if (!newSessionsMap.has(session.id)) {
                    updates.push(dbService.deleteSession(session.id));
                }
            });

            if (updates.length > 0) {
                Promise.all(updates)
                    .then(() => {
                        if (modifiedSessionIds.length === 1) {
                            broadcast({ type: 'SESSION_CONTENT_UPDATED', sessionId: modifiedSessionIds[0] });
                        } else {
                            broadcast({ type: 'SESSIONS_UPDATED' });
                        }
                    })
                    .catch(e => logService.error('Failed to persist session updates', { error: e }));
            }
        }
    }, [broadcast, savedSessions, activeChat, activeSessionId]);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups)
                .then(() => broadcast({ type: 'GROUPS_UPDATED' }))
                .catch(e => logService.error('Failed to persist group updates', { error: e }));
            return newGroups;
        });
    }, [broadcast]);

    const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
    const currentChatSettings = useMemo(() => activeChat?.settings || DEFAULT_CHAT_SETTINGS, [activeChat]);
    const isLoading = useMemo(() => loadingSessionIds.has(activeSessionId ?? ''), [loadingSessionIds, activeSessionId]);
    
    const setCurrentChatSettings = useCallback((updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => {
        if (!activeSessionId) return;
        updateAndPersistSessions(prevSessions =>
            prevSessions.map(s =>
                s.id === activeSessionId
                    ? { ...s, settings: updater(s.settings) }
                    : s
            )
        );
    }, [activeSessionId, updateAndPersistSessions]);

    return {
        savedSessions, setSavedSessions,
        savedGroups, setSavedGroups,
        activeSessionId, setActiveSessionId,
        editingMessageId, setEditingMessageId,
        editMode, setEditMode,
        commandedInput, setCommandedInput,
        loadingSessionIds, setLoadingSessionIds,
        generatingTitleSessionIds, setGeneratingTitleSessionIds,
        activeJobs,
        selectedFiles, setSelectedFiles,
        appFileError, setAppFileError,
        isAppProcessingFile, setIsAppProcessingFile,
        aspectRatio, setAspectRatio,
        imageSize, setImageSize,
        ttsMessageId, setTtsMessageId,
        isSwitchingModel, setIsSwitchingModel,
        userScrolledUp,
        activeChat,
        messages,
        currentChatSettings,
        isLoading,
        setCurrentChatSettings,
        updateAndPersistSessions,
        updateAndPersistGroups,
        fileDraftsRef,
        refreshSessions,
        refreshGroups,
        setSessionLoading,
        setActiveChat 
    };
};
