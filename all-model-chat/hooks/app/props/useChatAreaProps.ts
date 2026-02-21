import { useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { useAppLogic } from '../useAppLogic';
import { CANVAS_SYSTEM_PROMPT, BBOX_SYSTEM_PROMPT, HD_GUIDE_SYSTEM_PROMPT } from '../../../constants/appConstants';

// 核心优化：创建一个永远稳定的回调函数引用
// 这样可以确保传给 MessageList 和 Message (React.memo) 的函数地址永不改变，彻底阻断无效重渲染
function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
    const ref = useRef<T>(fn);
    useLayoutEffect(() => {
        ref.current = fn;
    });
    return useCallback((...args: any[]) => {
        return ref.current(...args);
    }, []) as T;
}

export const useChatAreaProps = (logic: ReturnType<typeof useAppLogic>) => {
  const {
    appSettings,
    chatState,
    uiState,
    pipState,
    currentTheme,
    language,
    t,
    sessionTitle,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
    handleOpenSidePanel,
  } = logic;

  // 使用 useStableCallback 包裹所有会传递给子组件的函数
  const onNewChat = useStableCallback(() => chatState.startNewChat());
  const onOpenSettingsModal = useStableCallback(() => uiState.setIsSettingsModalOpen(true));
  const onOpenScenariosModal = useStableCallback(() => uiState.setIsPreloadedMessagesModalOpen(true));
  const onToggleHistorySidebar = useStableCallback(() => uiState.setIsHistorySidebarOpen(prev => !prev));
  
  const onLoadCanvasPrompt = useStableCallback(handleLoadCanvasPromptAndSave);
  const onToggleBBox = useStableCallback(handleToggleBBoxMode);
  const onToggleGuide = useStableCallback(handleToggleGuideMode);
  
  const onScrollContainerScroll = useStableCallback(chatState.onScrollContainerScroll);
  const onEditMessage = useStableCallback(chatState.handleEditMessage);
  const onDeleteMessage = useStableCallback(chatState.handleDeleteMessage);
  const onRetryMessage = useStableCallback(chatState.handleRetryMessage);
  const onEditMessageContent = useStableCallback(chatState.handleUpdateMessageContent);
  const onUpdateMessageFile = useStableCallback(chatState.handleUpdateMessageFile);
  
  const onSuggestionClickStable = useStableCallback((text: string) => handleSuggestionClick('homepage', text));
  const onOrganizeInfoClickStable = useStableCallback((text: string) => handleSuggestionClick('organize', text));
  const onFollowUpSuggestionClickStable = useStableCallback((text: string) => handleSuggestionClick('follow-up', text));
  
  const onTextToSpeech = useStableCallback(chatState.handleTextToSpeech);
  const onGenerateCanvas = useStableCallback(chatState.handleGenerateCanvas);
  const onContinueGeneration = useStableCallback(chatState.handleContinueGeneration);
  const onQuickTTS = useStableCallback(chatState.handleQuickTTS);
  
  const setCommandedInput = useStableCallback(chatState.setCommandedInput);
  const onMessageSent = useStableCallback(() => chatState.setCommandedInput(null));
  const setSelectedFiles = useStableCallback(chatState.setSelectedFiles);
  const onSendMessage = useStableCallback((text: string, options?: { isFastMode?: boolean }) => chatState.handleSendMessage({ text, ...options }));
  
  const setEditingMessageId = useStableCallback(chatState.setEditingMessageId);
  const onStopGenerating = useStableCallback(chatState.handleStopGenerating);
  const onCancelEdit = useStableCallback(chatState.handleCancelEdit);
  const onProcessFiles = useStableCallback(chatState.handleProcessAndAddFiles);
  const onAddFileById = useStableCallback(chatState.handleAddFileById);
  const onCancelUpload = useStableCallback(chatState.handleCancelFileUpload);
  const onTranscribeAudio = useStableCallback(chatState.handleTranscribeAudio);
  
  const setAppFileError = useStableCallback(chatState.setAppFileError);
  const setAspectRatio = useStableCallback(chatState.setAspectRatio);
  const setImageSize = useStableCallback(chatState.setImageSize);
  
  const onToggleGoogleSearch = useStableCallback(chatState.toggleGoogleSearch);
  const onToggleCodeExecution = useStableCallback(chatState.toggleCodeExecution);
  const onToggleLocalPython = useStableCallback(chatState.toggleLocalPython);
  const onToggleUrlContext = useStableCallback(chatState.toggleUrlContext);
  const onToggleDeepSearch = useStableCallback(chatState.toggleDeepSearch);
  
  const onClearChat = useStableCallback(chatState.handleClearCurrentChat);
  const onOpenSettings = useStableCallback(() => uiState.setIsSettingsModalOpen(true));
  const onToggleCanvasPrompt = useStableCallback(handleLoadCanvasPromptAndSave);
  const onTogglePinCurrentSession = useStableCallback(chatState.handleTogglePinCurrentSession);
  const onRetryLastTurn = useStableCallback(chatState.handleRetryLastTurn);
  const onSelectModel = useStableCallback(chatState.handleSelectModelInHeader);
  const onEditLastUserMessage = useStableCallback(chatState.handleEditLastUserMessage);
  const onTogglePip = useStableCallback(pipState.togglePip);
  const onToggleQuadImages = useStableCallback(() => logic.setAppSettings(prev => ({ ...prev, generateQuadImages: !prev.generateQuadImages })));
  const onSetThinkingLevel = useStableCallback(handleSetThinkingLevel);
  const setCurrentChatSettings = useStableCallback(chatState.setCurrentChatSettings);
  const onOpenSidePanel = useStableCallback(handleOpenSidePanel);
  const onAddUserMessage = useStableCallback(chatState.handleAddUserMessage);
  const onLiveTranscript = useStableCallback(chatState.handleLiveTranscript);

  const handleAppDragEnter = useStableCallback(chatState.handleAppDragEnter);
  const handleAppDragOver = useStableCallback(chatState.handleAppDragOver);
  const handleAppDragLeave = useStableCallback(chatState.handleAppDragLeave);
  const handleAppDrop = useStableCallback(chatState.handleAppDrop);
  const setScrollContainerRef = useStableCallback(chatState.setScrollContainerRef);

  // getCurrentModelDisplayName 是立即求值的，得到的是 string (原始类型)，因此无需包装回调
  const currentModelName = getCurrentModelDisplayName();

  return useMemo(() => ({
    activeSessionId: chatState.activeSessionId,
    sessionTitle,
    currentChatSettings: chatState.currentChatSettings,
    setAppFileError,
    isAppDraggingOver: chatState.isAppDraggingOver,
    isProcessingDrop: chatState.isProcessingDrop,
    handleAppDragEnter,
    handleAppDragOver,
    handleAppDragLeave,
    handleAppDrop,
    onNewChat,
    onOpenSettingsModal,
    onOpenScenariosModal,
    onToggleHistorySidebar,
    isLoading: chatState.isLoading,
    currentModelName,
    availableModels: chatState.apiModels,
    selectedModelId: chatState.currentChatSettings.modelId || appSettings.modelId,
    onSelectModel,
    isSwitchingModel: chatState.isSwitchingModel,
    isHistorySidebarOpen: uiState.isHistorySidebarOpen,
    onLoadCanvasPrompt,
    isCanvasPromptActive: chatState.currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT,
    isBBoxModeActive: chatState.currentChatSettings.systemInstruction === BBOX_SYSTEM_PROMPT,
    isGuideModeActive: chatState.currentChatSettings.systemInstruction === HD_GUIDE_SYSTEM_PROMPT,
    onToggleBBox,
    onToggleGuide,
    isKeyLocked: !!chatState.currentChatSettings.lockedApiKey,
    themeId: currentTheme.id,
    modelsLoadingError: null,
    messages: chatState.messages,
    scrollContainerRef: chatState.scrollContainerRef,
    setScrollContainerRef,
    onScrollContainerScroll,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onEditMessageContent, 
    onUpdateMessageFile,
    showThoughts: chatState.currentChatSettings.showThoughts,
    baseFontSize: appSettings.baseFontSize,
    expandCodeBlocksByDefault: appSettings.expandCodeBlocksByDefault,
    isMermaidRenderingEnabled: appSettings.isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled: appSettings.isGraphvizRenderingEnabled ?? true,
    onSuggestionClick: onSuggestionClickStable,
    onOrganizeInfoClick: onOrganizeInfoClickStable,
    onFollowUpSuggestionClick: onFollowUpSuggestionClickStable,
    onTextToSpeech,
    onGenerateCanvas,
    onContinueGeneration,
    ttsMessageId: chatState.ttsMessageId,
    onQuickTTS,
    language,
    appSettings,
    commandedInput: chatState.commandedInput,
    setCommandedInput,
    onMessageSent,
    selectedFiles: chatState.selectedFiles,
    setSelectedFiles,
    onSendMessage,
    isEditing: !!chatState.editingMessageId,
    editMode: chatState.editMode,
    editingMessageId: chatState.editingMessageId,
    setEditingMessageId,
    onStopGenerating,
    onCancelEdit,
    onProcessFiles,
    onAddFileById,
    onCancelUpload,
    onTranscribeAudio,
    isProcessingFile: chatState.isAppProcessingFile,
    fileError: chatState.appFileError,
    isImagenModel: chatState.currentChatSettings.modelId?.includes('imagen'),
    isImageEditModel: chatState.currentChatSettings.modelId?.includes('image-preview'),
    aspectRatio: chatState.aspectRatio,
    setAspectRatio,
    imageSize: chatState.imageSize,
    setImageSize,
    isGoogleSearchEnabled: !!chatState.currentChatSettings.isGoogleSearchEnabled,
    onToggleGoogleSearch,
    isCodeExecutionEnabled: !!chatState.currentChatSettings.isCodeExecutionEnabled,
    onToggleCodeExecution,
    isLocalPythonEnabled: !!chatState.currentChatSettings.isLocalPythonEnabled,
    onToggleLocalPython,
    isUrlContextEnabled: !!chatState.currentChatSettings.isUrlContextEnabled,
    onToggleUrlContext,
    isDeepSearchEnabled: !!chatState.currentChatSettings.isDeepSearchEnabled,
    onToggleDeepSearch,
    onClearChat,
    onOpenSettings,
    onToggleCanvasPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onEditLastUserMessage,
    onOpenLogViewer: () => uiState.setIsLogViewerOpen(true),
    onClearAllHistory: chatState.clearAllHistory,
    isPipSupported: pipState.isPipSupported && appSettings.useCustomApiConfig,
    isPipActive: pipState.isPipActive,
    onTogglePip,
    generateQuadImages: appSettings.generateQuadImages ?? false,
    onToggleQuadImages,
    onSetThinkingLevel,
    setCurrentChatSettings,
    onOpenSidePanel,
    onAddUserMessage,
    onLiveTranscript,
    t,
  }), [
    // 现在的依赖数组中只剩下纯粹的数据和状态，排除了所有函数
    chatState.activeSessionId, 
    sessionTitle,
    chatState.currentChatSettings, 
    chatState.isAppDraggingOver, 
    chatState.isProcessingDrop,
    chatState.isLoading, 
    chatState.apiModels, 
    chatState.isSwitchingModel, 
    chatState.messages, 
    chatState.scrollContainerRef,
    chatState.ttsMessageId, 
    chatState.commandedInput, 
    chatState.selectedFiles,
    chatState.editingMessageId, 
    chatState.editMode, 
    chatState.isAppProcessingFile, 
    chatState.appFileError, 
    chatState.aspectRatio,
    chatState.imageSize, 
    
    uiState.isHistorySidebarOpen, 
    pipState.isPipSupported, 
    pipState.isPipActive,
    
    appSettings, 
    currentTheme.id, 
    language, 
    t,
    currentModelName,

    // 依然需要将这些稳定的回调传入依赖数组以满足 React Hook 规则的检测
    // 但由于上面用 useStableCallback 包装过，它们在组件整个生命周期中都不会改变
    setAppFileError, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar,
    onSelectModel, onLoadCanvasPrompt, onToggleBBox, onToggleGuide,
    setScrollContainerRef, onScrollContainerScroll, onEditMessage, onDeleteMessage, onRetryMessage,
    onEditMessageContent, onUpdateMessageFile, onSuggestionClickStable, onOrganizeInfoClickStable, onFollowUpSuggestionClickStable,
    onTextToSpeech, onGenerateCanvas, onContinueGeneration, onQuickTTS, setCommandedInput, onMessageSent,
    setSelectedFiles, onSendMessage, setEditingMessageId, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, onTranscribeAudio, setAspectRatio, setImageSize, onToggleGoogleSearch,
    onToggleCodeExecution, onToggleLocalPython, onToggleUrlContext, onToggleDeepSearch, onClearChat, onOpenSettings,
    onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage, onTogglePip,
    onToggleQuadImages, onSetThinkingLevel, setCurrentChatSettings, onOpenSidePanel,
    onAddUserMessage, onLiveTranscript
  ]);
};
