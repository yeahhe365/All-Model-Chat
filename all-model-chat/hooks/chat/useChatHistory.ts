
import React, { Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, UploadedFile, ChatGroup, InputCommand } from '../../types';
import { getTranslator } from '../../utils/appUtils';
import { useSessionLoader } from './history/useSessionLoader';
import { useSessionActions } from './history/useSessionActions';
import { useGroupActions } from './history/useGroupActions';
import { useHistoryClearer } from './history/useHistoryClearer';

type CommandedInputSetter = Dispatch<SetStateAction<InputCommand | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
type GroupsUpdater = (updater: (prev: ChatGroup[]) => ChatGroup[]) => Promise<void>;

interface ChatHistoryProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    setCommandedInput: CommandedInputSetter;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    updateAndPersistSessions: SessionsUpdater;
    updateAndPersistGroups: GroupsUpdater;
    activeChat: SavedChatSession | undefined;
    language: 'en' | 'zh';
    userScrolledUp: React.MutableRefObject<boolean>;
    selectedFiles: UploadedFile[];
    fileDraftsRef: React.MutableRefObject<Record<string, UploadedFile[]>>;
    activeSessionId: string | null;
    setActiveChat?: Dispatch<SetStateAction<SavedChatSession | undefined>>;
}

export const useChatHistory = ({
    appSettings,
    setSavedSessions,
    setSavedGroups,
    setActiveSessionId,
    setEditingMessageId,
    setCommandedInput,
    setSelectedFiles,
    activeJobs,
    updateAndPersistSessions,
    updateAndPersistGroups,
    activeChat,
    language,
    userScrolledUp,
    selectedFiles,
    fileDraftsRef,
    activeSessionId,
    setActiveChat,
}: ChatHistoryProps) => {
    const t = getTranslator(language);

    const { startNewChat, loadChatSession, loadInitialData } = useSessionLoader({
        appSettings,
        setSavedSessions,
        setSavedGroups,
        setActiveSessionId,
        setSelectedFiles,
        setEditingMessageId,
        updateAndPersistSessions,
        activeChat,
        userScrolledUp,
        selectedFiles,
        fileDraftsRef,
        activeSessionId,
        setActiveChat
    });

    const { 
        handleDeleteChatHistorySession,
        handleRenameSession,
        handleTogglePinSession,
        handleDuplicateSession
    } = useSessionActions({
        updateAndPersistSessions,
        activeJobs
    });

    const {
        handleAddNewGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleMoveSessionToGroup,
        handleToggleGroupExpansion
    } = useGroupActions({
        updateAndPersistGroups,
        updateAndPersistSessions,
        t
    });

    const { clearAllHistory, clearCacheAndReload } = useHistoryClearer({
        setSavedSessions,
        setSavedGroups,
        startNewChat,
        activeJobs
    });

    return {
        loadInitialData,
        loadChatSession,
        startNewChat,
        handleDeleteChatHistorySession,
        handleRenameSession,
        handleTogglePinSession,
        handleDuplicateSession,
        handleAddNewGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleMoveSessionToGroup,
        handleToggleGroupExpansion,
        clearAllHistory,
        clearCacheAndReload,
    };
};
