import { afterEach, beforeEach } from 'vitest';
import { useChatStore } from '../stores/chatStore';
import { useChatRuntimeStore } from '../stores/chatRuntimeStore';
import { useSettingsStore } from '../stores/settingsStore';

const initialSettingsState = useSettingsStore.getState();
const initialChatState = useChatStore.getState();

export const resetSettingsStoreState = () => {
  useSettingsStore.setState({
    appSettings: { ...initialSettingsState.appSettings },
    currentTheme: initialSettingsState.currentTheme,
    language: initialSettingsState.language,
    isSettingsLoaded: initialSettingsState.isSettingsLoaded,
    pendingPreloadSettingsOverrides: initialSettingsState.pendingPreloadSettingsOverrides,
  });
};

export const resetChatStoreState = () => {
  const currentState = useChatStore.getState();

  currentState._activeJobs.current.clear();
  currentState._userScrolledUp.current = false;
  currentState._fileDrafts.current = {};

  useChatStore.setState({
    savedSessions: [...initialChatState.savedSessions],
    savedGroups: [...initialChatState.savedGroups],
    activeSessionId: initialChatState.activeSessionId,
    activeMessages: [...initialChatState.activeMessages],
    editingMessageId: initialChatState.editingMessageId,
    editMode: initialChatState.editMode,
    commandedInput: initialChatState.commandedInput,
    loadingSessionIds: new Set(initialChatState.loadingSessionIds),
    generatingTitleSessionIds: new Set(initialChatState.generatingTitleSessionIds),
    selectedFiles: [...initialChatState.selectedFiles],
    appFileError: initialChatState.appFileError,
    isAppProcessingFile: initialChatState.isAppProcessingFile,
    aspectRatio: initialChatState.aspectRatio,
    imageSize: initialChatState.imageSize,
    imageOutputMode: initialChatState.imageOutputMode,
    personGeneration: initialChatState.personGeneration,
    isSwitchingModel: initialChatState.isSwitchingModel,
    _activeJobs: initialChatState._activeJobs,
    _userScrolledUp: initialChatState._userScrolledUp,
    _fileDrafts: initialChatState._fileDrafts,
  });
};

const resetChatRuntimeStoreState = () => {
  useChatRuntimeStore.getState().resetChatRuntime();
};

export const resetAllStoreState = () => {
  resetSettingsStoreState();
  resetChatStoreState();
  resetChatRuntimeStoreState();
};

export const setupStoreStateReset = () => {
  beforeEach(resetAllStoreState);
  afterEach(resetAllStoreState);
};
