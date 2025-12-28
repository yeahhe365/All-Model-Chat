
import { useState, useRef, useCallback, useMemo } from 'react';
import { AppSettings, ChatGroup, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, InputCommand } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { dbService } from '../../utils/db';
import { logService } from '../../utils/appUtils';

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

    const updateAndPersistSessions = useCallback(async (
        updater: (prev: SavedChatSession[]) => SavedChatSession[],
        options: { persist?: boolean } = {}
    ) => {
        const { persist = true } = options;
        setSavedSessions(prevSessions => {
            const newSessions = updater(prevSessions);
            if (persist) {
                // Optimization: Granular updates based on reference equality
                const updates: Promise<void>[] = [];
                const newSessionsMap = new Map(newSessions.map(s => [s.id, s]));
                
                // 1. Detect Updated or Added sessions
                // We rely on React immutability: if reference changes, object changed.
                newSessions.forEach(session => {
                    const prevSession = prevSessions.find(s => s.id === session.id);
                    if (prevSession !== session) {
                        updates.push(dbService.saveSession(session));
                    }
                });

                // 2. Detect Deleted sessions
                prevSessions.forEach(session => {
                    if (!newSessionsMap.has(session.id)) {
                        updates.push(dbService.deleteSession(session.id));
                    }
                });

                if (updates.length > 0) {
                    Promise.all(updates)
                        // .then(() => logService.debug(`Persisted ${updates.length} session updates atomically.`))
                        .catch(e => logService.error('Failed to persist session updates', { error: e }));
                }
            }
            return newSessions;
        });
    }, []);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups);
            return newGroups;
        });
    }, []);

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
    };
};
