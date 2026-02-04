
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AppSettings, ChatGroup, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, InputCommand, ChatSessionMetadata } from '../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../constants/appConstants';
import { dbService } from '../../utils/db';
import { logService, rehydrateSessionFiles } from '../../utils/appUtils';
import { useMultiTabSync } from '../core/useMultiTabSync';

export const useChatState = (appSettings: AppSettings) => {
    // Stores only metadata to save memory (no 'messages' array)
    const [savedSessions, setSavedSessions] = useState<ChatSessionMetadata[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
    
    // Stores the FULL session object for the currently active chat
    const [activeChatSession, setActiveChatSession] = useState<SavedChatSession | null>(null);
    
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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

    const localLoadingSessionIds = useRef(new Set<string>());

    // Sync active session ID to sessionStorage and URL
    useEffect(() => {
        if (activeSessionId) {
            try {
                sessionStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId);
            } catch (e) { }
            
            const targetPath = `/chat/${activeSessionId}`;
            try {
                if (window.location.pathname !== targetPath) {
                    window.history.pushState({ sessionId: activeSessionId }, '', targetPath);
                }
            } catch (e) { }
        } else {
            try {
                sessionStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
            } catch (e) { }
            try {
                if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/chat/')) {
                     window.history.pushState({}, '', '/');
                }
            } catch (e) { }
        }
    }, [activeSessionId]);

    const refreshSessions = useCallback(async () => {
        try {
            // Lazy Load: Fetch only metadata
            const sessions = await dbService.getAllSessionMetadata();
            sessions.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
            setSavedSessions(sessions);
        } catch (e) {
            logService.error("Failed to refresh session metadata from DB", { error: e });
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

    const refreshActiveSession = useCallback(async (id: string) => {
        try {
            const session = await dbService.getSessionById(id);
            if (session) {
                const rehydrated = rehydrateSessionFiles(session);
                setActiveChatSession(rehydrated);
            }
        } catch (e) {
            logService.error("Failed to refresh active session content", { error: e });
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
            if (localLoadingSessionIds.current.has(id)) {
                return;
            }
            if (id === activeSessionId) {
                refreshActiveSession(id);
            } else {
                refreshSessions(); // Metadata might have changed (e.g. preview)
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

    // Updater for LIST operations (Metadata only). 
    // Consumers must NOT rely on 'messages' field in the updater callback.
    // However, if the updater returns a full object (e.g. creating new session), we strip messages for the state list.
    const updateAndPersistSessions = useCallback(async (
        updater: (prev: SavedChatSession[]) => SavedChatSession[],
        options: { persist?: boolean } = {}
    ) => {
        const { persist = true } = options;

        // Note: The updater here technically receives metadata but typed as SavedChatSession for compatibility 
        // with existing hooks that just map over IDs/settings.
        // If an existing hook tries to access .messages on these items, it will fail/get undefined.
        // We ensure hooks are robust or use the dedicated active session updater.
        
        // However, some hooks create NEW sessions which are full objects.
        // We handle the split: New full sessions go to DB + ActiveState. Metadata goes to ListState.

        // 1. Calculate new state based on current list (metadata)
        const currentList = savedSessions as unknown as SavedChatSession[]; // Cast for compat
        const newList = updater(currentList);
        
        // 2. Identify changes
        const newListMap = new Map(newList.map(s => [s.id, s]));
        const prevListMap = new Map(currentList.map(s => [s.id, s]));
        
        const updates: Promise<void>[] = [];
        const modifiedIds: string[] = [];

        // 3. Handle Active Session Synchronization logic inside the updater loop? 
        // No, the updater returns the desired state. We must process it.
        
        // Special Case: If the updater modified the ACTIVE session in the list, we must sync that to activeChatSession state.
        // BUT, the updater was operating on metadata. It likely updated title, settings, pin, etc.
        // It did NOT update messages because they weren't in the list.
        
        const activeItemInNewList = newList.find(s => s.id === activeSessionId);
        if (activeItemInNewList && activeChatSession) {
            // Check if metadata changed
            const activeItemInPrev = currentList.find(s => s.id === activeSessionId);
            if (activeItemInPrev !== activeItemInNewList) {
                // Merge metadata updates into active session state
                const updatedActiveSession = {
                    ...activeChatSession,
                    ...activeItemInNewList, // Overlay metadata changes
                    messages: activeChatSession.messages // Preserve full messages
                };
                setActiveChatSession(updatedActiveSession);
                
                if (persist) {
                    updates.push(dbService.saveSession(updatedActiveSession));
                    modifiedIds.push(updatedActiveSession.id);
                }
            }
        }

        // 4. Handle other sessions (Persist to DB)
        if (persist) {
            // New sessions created (e.g. New Chat)
            newList.forEach(session => {
                if (!prevListMap.has(session.id)) {
                    // New session. It might have messages (e.g. from template).
                    updates.push(dbService.saveSession(session));
                    modifiedIds.push(session.id);
                    
                    // If it's the active one, we set it above via setActiveChatSession if the caller did setActiveSessionId
                    // But usually caller sets ID separately.
                } else if (session.id !== activeSessionId) {
                    // Existing inactive session modified (e.g. rename/pin inactive)
                    if (session !== prevListMap.get(session.id)) {
                         // We only have metadata here. We need to fetch full, merge, save?
                         // OR we assume DB saveSession can handle partial update? No, IDB put overwrites.
                         // Optimization: If only metadata changed, we need to fetch full, update meta, save.
                         updates.push(
                             dbService.getSessionById(session.id).then(full => {
                                 if (full) {
                                     return dbService.saveSession({ ...full, ...session });
                                 }
                             })
                         );
                         modifiedIds.push(session.id);
                    }
                }
            });

            // Deleted sessions
            currentList.forEach(session => {
                if (!newListMap.has(session.id)) {
                    updates.push(dbService.deleteSession(session.id));
                }
            });
        }

        // 5. Update Metadata List State
        const newMetadataList: ChatSessionMetadata[] = newList.map(s => {
            // Strip messages for the list state
            const { messages, ...meta } = s; 
            return meta;
        });
        
        newMetadataList.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.timestamp - a.timestamp;
        });

        setSavedSessions(newMetadataList);
        
        if (persist && updates.length > 0) {
            Promise.all(updates)
                .then(() => {
                    if (modifiedIds.length === 1) broadcast({ type: 'SESSION_CONTENT_UPDATED', sessionId: modifiedIds[0] });
                    else broadcast({ type: 'SESSIONS_UPDATED' });
                })
                .catch(e => logService.error('Failed to persist updates', { error: e }));
        }

        return newList; // Return for compatibility, though result unused by caller usually
    }, [savedSessions, activeSessionId, activeChatSession, broadcast]);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups)
                .then(() => broadcast({ type: 'GROUPS_UPDATED' }))
                .catch(e => logService.error('Failed to persist group updates', { error: e }));
            return newGroups;
        });
    }, [broadcast]);

    const activeChat = activeChatSession || (savedSessions.find(s => s.id === activeSessionId) as SavedChatSession | undefined);
    // Note: If activeChatSession is null (not loaded yet) but ID exists in list, we might return metadata only object.
    // The UI should handle empty messages gracefully or show loading.
    
    const messages = useMemo(() => activeChatSession?.messages || [], [activeChatSession]);
    const currentChatSettings = useMemo(() => activeChat?.settings || DEFAULT_CHAT_SETTINGS, [activeChat]);
    const isLoading = useMemo(() => loadingSessionIds.has(activeSessionId ?? ''), [loadingSessionIds, activeSessionId]);
    
    const setCurrentChatSettings = useCallback((updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => {
        if (!activeSessionId || !activeChatSession) return;
        
        const newSettings = updater(activeChatSession.settings);
        const updatedSession = { ...activeChatSession, settings: newSettings };
        
        setActiveChatSession(updatedSession);
        
        // Sync to list
        const { messages, ...metadata } = updatedSession;
        setSavedSessions(prev => prev.map(s => s.id === activeSessionId ? metadata : s));
        
        dbService.saveSession(updatedSession).then(() => {
            // Optional: Broadcast if needed
        });
    }, [activeSessionId, activeChatSession]);

    return {
        savedSessions, setSavedSessions,
        savedGroups, setSavedGroups,
        activeSessionId, setActiveSessionId,
        activeChatSession, setActiveChatSession, // Export specific setter
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
        setSessionLoading 
    };
};