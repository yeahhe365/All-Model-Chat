import React, { Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, UploadedFile, ChatGroup, InputCommand, ChatMessage } from '../../types';
import { getTranslator } from '../../utils/translations';
import { useSessionLoader } from './history/useSessionLoader';
import { useSessionActions } from './history/useSessionActions';
import { useGroupActions } from './history/useGroupActions';
import { useHistoryClearer } from './history/useHistoryClearer';

type CommandedInputSetter = Dispatch<SetStateAction<InputCommand | null>>;
type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void | Promise<void>;
type GroupsUpdater = (updater: (prev: ChatGroup[]) => ChatGroup[]) => void | Promise<void>;

interface ChatHistoryProps {
  appSettings: AppSettings;
  setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
  setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setActiveMessages: Dispatch<SetStateAction<ChatMessage[]>>; // Added setter
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  setCommandedInput: CommandedInputSetter;
  setAppFileError: Dispatch<SetStateAction<string | null>>;
  setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
  updateAndPersistSessions: SessionsUpdater;
  updateAndPersistGroups: GroupsUpdater;
  activeChat: SavedChatSession | undefined;
  language: 'en' | 'zh';
  userScrolledUpRef: React.MutableRefObject<boolean>;
  selectedFiles: UploadedFile[];
  fileDraftsRef: React.MutableRefObject<Record<string, UploadedFile[]>>;
  activeSessionId: string | null;
  savedSessions: SavedChatSession[];
}

export const useChatHistory = ({
  appSettings,
  setSavedSessions,
  setSavedGroups,
  setActiveSessionId,
  setActiveMessages,
  setEditingMessageId,
  setCommandedInput,
  setAppFileError,
  setSelectedFiles,
  activeJobs,
  updateAndPersistSessions,
  updateAndPersistGroups,
  activeChat,
  language,
  userScrolledUpRef,
  selectedFiles,
  fileDraftsRef,
  activeSessionId,
  savedSessions,
}: ChatHistoryProps) => {
  const t = getTranslator(language);

  const { startNewChat, loadChatSession, loadInitialData } = useSessionLoader({
    appSettings,
    setSavedSessions,
    setSavedGroups,
    setActiveSessionId,
    setActiveMessages,
    setSelectedFiles,
    setEditingMessageId,
    setCommandedInput,
    setAppFileError,
    updateAndPersistSessions,
    activeChat,
    userScrolledUpRef,
    selectedFiles,
    fileDraftsRef,
    activeSessionId,
    savedSessions,
  });

  const { handleDeleteChatHistorySession, handleRenameSession, handleTogglePinSession, handleDuplicateSession } =
    useSessionActions({
      updateAndPersistSessions,
      activeJobs,
    });

  const {
    handleAddNewGroup,
    handleDeleteGroup,
    handleRenameGroup,
    handleMoveSessionToGroup,
    handleToggleGroupExpansion,
  } = useGroupActions({
    updateAndPersistGroups,
    updateAndPersistSessions,
    t,
  });

  const { clearAllHistory, clearCacheAndReload } = useHistoryClearer({
    savedSessions,
    setSavedSessions,
    setSavedGroups,
    startNewChat,
    activeJobs,
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
