import { useRef, useLayoutEffect, useCallback } from 'react';
import { useAppLogic } from '../useAppLogic';
import { CANVAS_SYSTEM_PROMPT, BBOX_SYSTEM_PROMPT, HD_GUIDE_SYSTEM_PROMPT } from '../../../constants/appConstants';
import { useUIStore } from '../../../stores/uiStore';
import { useChatStore } from '../../../stores/chatStore';

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
    pipState,
    sessionTitle,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
    handleOpenSidePanel,
    t,
  } = logic;

  // UI state from Zustand store
  const setIsSettingsModalOpen = useUIStore((s) => s.setIsSettingsModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((s) => s.setIsPreloadedMessagesModalOpen);
  const toggleHistorySidebar = useUIStore((s) => s.toggleHistorySidebar);

  // 使用 useStableCallback 包裹所有会传递给子组件的函数
  const onNewChat = useStableCallback(() => chatState.startNewChat());
  const onOpenSettingsModal = useStableCallback(() => setIsSettingsModalOpen(true));
  const onOpenScenariosModal = useStableCallback(() => setIsPreloadedMessagesModalOpen(true));
  const onToggleHistorySidebar = useStableCallback(() => toggleHistorySidebar());

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

  // These handlers still need to be returned — children receive them as props
  const onMessageSent = useStableCallback(() => useChatStore.getState().setCommandedInput(null));
  const onSendMessage = useStableCallback((text: string, options?: { isFastMode?: boolean }) => chatState.handleSendMessage({ text, ...options }));

  const onStopGenerating = useStableCallback(chatState.handleStopGenerating);
  const onCancelEdit = useStableCallback(chatState.handleCancelEdit);
  const onProcessFiles = useStableCallback(chatState.handleProcessAndAddFiles);
  const onAddFileById = useStableCallback(chatState.handleAddFileById);
  const onCancelUpload = useStableCallback(chatState.handleCancelFileUpload);
  const onTranscribeAudio = useStableCallback(chatState.handleTranscribeAudio);

  const onToggleGoogleSearch = useStableCallback(chatState.toggleGoogleSearch);
  const onToggleCodeExecution = useStableCallback(chatState.toggleCodeExecution);
  const onToggleLocalPython = useStableCallback(chatState.toggleLocalPython);
  const onToggleUrlContext = useStableCallback(chatState.toggleUrlContext);
  const onToggleDeepSearch = useStableCallback(chatState.toggleDeepSearch);

  const onClearChat = useStableCallback(chatState.handleClearCurrentChat);
  const onOpenSettings = useStableCallback(() => setIsSettingsModalOpen(true));
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

  return {
    // IDs & Data (still needed by ChatArea)
    activeSessionId: chatState.activeSessionId,
    sessionTitle,
    currentChatSettings: chatState.currentChatSettings,
    messages: chatState.messages,
    scrollContainerRef: chatState.scrollContainerRef,
    modelsLoadingError: null as string | null,

    // Computed values
    isLoading: chatState.isLoading,
    currentModelName,
    availableModels: chatState.apiModels,
    selectedModelId: chatState.currentChatSettings.modelId || appSettings.modelId,
    isCanvasPromptActive: chatState.currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT,
    isBBoxModeActive: chatState.currentChatSettings.systemInstruction === BBOX_SYSTEM_PROMPT,
    isGuideModeActive: chatState.currentChatSettings.systemInstruction === HD_GUIDE_SYSTEM_PROMPT,
    isKeyLocked: !!chatState.currentChatSettings.lockedApiKey,
    isEditing: !!chatState.editingMessageId,
    isImagenModel: chatState.currentChatSettings.modelId?.includes('imagen'),
    isImageEditModel: chatState.currentChatSettings.modelId?.includes('image-preview'),
    showThoughts: chatState.currentChatSettings.showThoughts,
    isPipSupported: pipState.isPipSupported && appSettings.useCustomApiConfig,
    isPipActive: pipState.isPipActive,
    generateQuadImages: appSettings.generateQuadImages ?? false,
    isGoogleSearchEnabled: !!chatState.currentChatSettings.isGoogleSearchEnabled,
    isCodeExecutionEnabled: !!chatState.currentChatSettings.isCodeExecutionEnabled,
    isLocalPythonEnabled: !!chatState.currentChatSettings.isLocalPythonEnabled,
    isUrlContextEnabled: !!chatState.currentChatSettings.isUrlContextEnabled,
    isDeepSearchEnabled: !!chatState.currentChatSettings.isDeepSearchEnabled,

    // Drag/drop state
    isAppDraggingOver: chatState.isAppDraggingOver,
    isProcessingDrop: chatState.isProcessingDrop,

    // All handlers (stable references)
    handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    setScrollContainerRef, onScrollContainerScroll,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar,
    onLoadCanvasPrompt, onToggleBBox, onToggleGuide,
    onSelectModel, onSetThinkingLevel,
    onEditMessage, onDeleteMessage, onRetryMessage,
    onEditMessageContent, onUpdateMessageFile,
    onSuggestionClick: onSuggestionClickStable,
    onOrganizeInfoClick: onOrganizeInfoClickStable,
    onFollowUpSuggestionClick: onFollowUpSuggestionClickStable,
    onTextToSpeech, onGenerateCanvas, onContinueGeneration, onQuickTTS,
    onMessageSent, onSendMessage,
    onStopGenerating, onCancelEdit,
    onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    onToggleGoogleSearch, onToggleCodeExecution, onToggleLocalPython,
    onToggleUrlContext, onToggleDeepSearch,
    onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    onTogglePip, onToggleQuadImages,
    setCurrentChatSettings, onOpenSidePanel,
    onAddUserMessage, onLiveTranscript,
    t,
  };
};
