
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AppSettings, ChatGroup, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, InputCommand, ChatMessage } from '../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../constants/appConstants';
import { dbService } from '../../utils/db';
import { logService, rehydrateSessionFiles } from '../../utils/appUtils';
import { useMultiTabSync } from '../core/useMultiTabSync';

export const useChatState = (appSettings: AppSettings) => {
    // Session Metadata List (messages field is always empty [] in this array to save memory/renders)
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
    
    // Active Session State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
    
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
    
    // Refs to access latest state inside the heavy updater without adding dependencies
    const activeMessagesRef = useRef<ChatMessage[]>([]);
    const activeSessionIdRef = useRef<string | null>(null);

    useEffect(() => { activeMessagesRef.current = activeMessages; }, [activeMessages]);
    useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

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
            // If THIS tab is currently streaming for this session, ignore update to avoid stutter
            if (localLoadingSessionIds.current.has(id)) {
                return;
            }
            // If the updated session is the active one, reload it fully. 
            // If it's a background session, refreshSessions (metadata) is enough.
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
    }, [broadcast]);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups)
                .then(() => broadcast({ type: 'GROUPS_UPDATED' }))
                .catch(e => logService.error('Failed to persist group updates', { error: e }));
            return newGroups;
        });
    }, [broadcast]);

    // Construct the full active chat object on the fly for consumers
    const activeChat = useMemo(() => {
        const metadata = savedSessions.find(s => s.id === activeSessionId);
        if (metadata) {
            return { ...metadata, messages: activeMessages };
        }
        return undefined;
    }, [savedSessions, activeSessionId, activeMessages]);

    // Fallback/Default settings
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
        setActiveMessages, // Export setter for loader
        activeMessages, // Export messages for direct usage
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
        messages: activeMessages, // Expose as 'messages' for compat
        currentChatSettings,
        isLoading,
        setCurrentChatSettings,
        updateAndPersistSessions,
        updateAndPersistGroups,
        fileDraftsRef,
        refreshSessions,
        refreshGroups,
        setSessionLoading 
    };
};
