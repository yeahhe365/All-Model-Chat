import { useChatStore } from '../../stores/chatStore';

export const useChatStoreBindings = () => {
  const savedGroups = useChatStore((state) => state.savedGroups);
  const editingMessageId = useChatStore((state) => state.editingMessageId);
  const editMode = useChatStore((state) => state.editMode);
  const commandedInput = useChatStore((state) => state.commandedInput);
  const loadingSessionIds = useChatStore((state) => state.loadingSessionIds);
  const generatingTitleSessionIds = useChatStore((state) => state.generatingTitleSessionIds);
  const selectedFiles = useChatStore((state) => state.selectedFiles);
  const appFileError = useChatStore((state) => state.appFileError);
  const isAppProcessingFile = useChatStore((state) => state.isAppProcessingFile);
  const aspectRatio = useChatStore((state) => state.aspectRatio);
  const imageSize = useChatStore((state) => state.imageSize);
  const imageOutputMode = useChatStore((state) => state.imageOutputMode);
  const personGeneration = useChatStore((state) => state.personGeneration);
  const isSwitchingModel = useChatStore((state) => state.isSwitchingModel);

  const setActiveSessionId = useChatStore((state) => state.setActiveSessionId);
  const setActiveMessages = useChatStore((state) => state.setActiveMessages);
  const setCommandedInput = useChatStore((state) => state.setCommandedInput);
  const setSavedSessions = useChatStore((state) => state.setSavedSessions);
  const setSavedGroups = useChatStore((state) => state.setSavedGroups);
  const setEditingMessageId = useChatStore((state) => state.setEditingMessageId);
  const setSelectedFiles = useChatStore((state) => state.setSelectedFiles);
  const setAppFileError = useChatStore((state) => state.setAppFileError);
  const setEditMode = useChatStore((state) => state.setEditMode);
  const setIsAppProcessingFile = useChatStore((state) => state.setIsAppProcessingFile);
  const setAspectRatio = useChatStore((state) => state.setAspectRatio);
  const setImageSize = useChatStore((state) => state.setImageSize);
  const setIsSwitchingModel = useChatStore((state) => state.setIsSwitchingModel);
  const setGeneratingTitleSessionIds = useChatStore((state) => state.setGeneratingTitleSessionIds);
  const updateAndPersistSessions = useChatStore((state) => state.updateAndPersistSessions);
  const updateAndPersistGroups = useChatStore((state) => state.updateAndPersistGroups);
  const setSessionLoading = useChatStore((state) => state.setSessionLoading);
  const setCurrentChatSettings = useChatStore((state) => state.setCurrentChatSettings);

  const activeJobs = useChatStore.getState()._activeJobs;
  const userScrolledUpRef = useChatStore.getState()._userScrolledUp;
  const fileDraftsRef = useChatStore.getState()._fileDrafts;

  return {
    savedGroups,
    editingMessageId,
    editMode,
    commandedInput,
    loadingSessionIds,
    generatingTitleSessionIds,
    selectedFiles,
    appFileError,
    isAppProcessingFile,
    aspectRatio,
    imageSize,
    imageOutputMode,
    personGeneration,
    isSwitchingModel,
    setActiveSessionId,
    setActiveMessages,
    setCommandedInput,
    setSavedSessions,
    setSavedGroups,
    setEditingMessageId,
    setSelectedFiles,
    setAppFileError,
    setEditMode,
    setIsAppProcessingFile,
    setAspectRatio,
    setImageSize,
    setIsSwitchingModel,
    setGeneratingTitleSessionIds,
    updateAndPersistSessions,
    updateAndPersistGroups,
    setSessionLoading,
    setCurrentChatSettings,
    activeJobs,
    userScrolledUpRef,
    fileDraftsRef,
  };
};
