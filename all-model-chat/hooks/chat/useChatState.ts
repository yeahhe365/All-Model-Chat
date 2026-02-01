import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AppSettings, ChatGroup, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, InputCommand } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { dbService } from '../../utils/db';
import { logService, rehydrateSessionFiles } from '../../utils/appUtils';
import { useMultiTabSync } from '../core/useMultiTabSync';

export const useChatState = (appSettings: AppSettings) => {
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
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

    const refreshSessions = useCallback(async () => {
        try {
            const sessions = await dbService.getAllSessions();
            const rehydrated = sessions.map(rehydrateSessionFiles);
            rehydrated.sort((a, b) => b.timestamp - a.timestamp);
            setSavedSessions(rehydrated);
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
            // Optimization: If THIS tab is currently streaming for this session, ignore the refresh
            // to avoid state flickering or resetting.
            if (loadingSessionIds.has(id)) {
                return;
            }
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
        
        setSavedSessions(prevSessions => {
            const newSessions = updater(prevSessions);
            
            if (persist) {
                const updates: Promise<void>[] = [];
                const newSessionsMap = new Map(newSessions.map(s => [s.id, s]));
                const modifiedSessionIds: string[] = [];

                newSessions.forEach(session => {
                    const prevSession = prevSessions.find(s => s.id === session.id);
                    if (prevSession !== session) {
                        updates.push(dbService.saveSession(session));
                        modifiedSessionIds.push(session.id);
                    }
                });

                prevSessions.forEach(session => {
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
            return newSessions;
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

    const activeChat = useMemo(() => savedSessions.find(s => s.id === activeSessionId), [savedSessions, activeSessionId]);
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
        setSessionLoading 
    };
};