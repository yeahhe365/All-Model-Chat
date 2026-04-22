import React, { useMemo } from 'react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/input/ChatInput';
import { DragDropOverlay } from '../chat/overlays/DragDropOverlay';
import { ModelsErrorDisplay } from '../chat/overlays/ModelsErrorDisplay';
import { ChatAreaProps } from './chat-area/ChatAreaProps';
import { ChatAreaProvider } from './chat-area/ChatAreaContext';
import { useChatArea } from './chat-area/useChatArea';
import { getShortcutDisplay } from '../../utils/shortcutUtils';
import { getVisibleChatMessages } from '../../utils/chat/visibility';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';

export type { ChatAreaProps };

export const ChatArea: React.FC<ChatAreaProps> = ({ chatArea }) => {
  const {
    session,
    shell,
    header,
    messageActions,
    inputActions,
    features,
  } = chatArea;

  // Read values from stores directly (no longer passed as props)
  const appSettings = useSettingsStore(s => s.appSettings);
  const themeId = useSettingsStore(s => s.currentTheme.id);
  const isSwitchingModel = useChatStore(s => s.isSwitchingModel);
  const isHistorySidebarOpen = useUIStore(s => s.isHistorySidebarOpen);
  const commandedInput = useChatStore(s => s.commandedInput);
  const selectedFiles = useChatStore(s => s.selectedFiles);
  const setSelectedFiles = useChatStore(s => s.setSelectedFiles);
  const editingMessageId = useChatStore(s => s.editingMessageId);
  const setEditingMessageId = useChatStore(s => s.setEditingMessageId);
  const editMode = useChatStore(s => s.editMode);
  const isProcessingFile = useChatStore(s => s.isAppProcessingFile);
  const fileError = useChatStore(s => s.appFileError);
  const setAppFileError = useChatStore(s => s.setAppFileError);
  const aspectRatio = useChatStore(s => s.aspectRatio);
  const setAspectRatio = useChatStore(s => s.setAspectRatio);
  const imageSize = useChatStore(s => s.imageSize);
  const setImageSize = useChatStore(s => s.setImageSize);
  const imageOutputMode = useChatStore(s => s.imageOutputMode);
  const setImageOutputMode = useChatStore(s => s.setImageOutputMode);
  const personGeneration = useChatStore(s => s.personGeneration);
  const setPersonGeneration = useChatStore(s => s.setPersonGeneration);

  const { chatInputHeight, chatInputContainerRef, isImagenModel, handleQuote, handleInsert } = useChatArea({
    currentChatSettings: session.currentChatSettings,
  });

  const newChatShortcut = useMemo(() => getShortcutDisplay('general.newChat', appSettings), [appSettings]);
  const pipShortcut = useMemo(() => getShortcutDisplay('general.togglePip', appSettings), [appSettings]);
  const showEmptyStateSuggestions = getVisibleChatMessages(session.messages).length === 0;
  const messageListValue = useMemo(
    () => ({
      messages: session.messages,
      sessionTitle: session.sessionTitle,
      setScrollContainerRef: messageActions.setScrollContainerRef,
      onEditMessage: messageActions.onEditMessage,
      onDeleteMessage: messageActions.onDeleteMessage,
      onRetryMessage: messageActions.onRetryMessage,
      onUpdateMessageFile: messageActions.onUpdateMessageFile,
      showThoughts: session.showThoughts,
      themeId,
      baseFontSize: appSettings.baseFontSize,
      expandCodeBlocksByDefault: appSettings.expandCodeBlocksByDefault,
      isMermaidRenderingEnabled: appSettings.isMermaidRenderingEnabled,
      isGraphvizRenderingEnabled: appSettings.isGraphvizRenderingEnabled ?? true,
      onSuggestionClick: messageActions.onSuggestionClick,
      onOrganizeInfoClick: messageActions.onOrganizeInfoClick,
      onFollowUpSuggestionClick: messageActions.onFollowUpSuggestionClick,
      onGenerateCanvas: messageActions.onGenerateCanvas,
      onContinueGeneration: messageActions.onContinueGeneration,
      onQuickTTS: messageActions.onQuickTTS,
      chatInputHeight,
      appSettings,
      currentModelId: session.currentChatSettings.modelId,
      onOpenSidePanel: messageActions.onOpenSidePanel,
      onQuote: handleQuote,
      onInsert: handleInsert,
      activeSessionId: session.activeSessionId,
    }),
    [
      appSettings,
      chatInputHeight,
      handleInsert,
      handleQuote,
      messageActions,
      session.activeSessionId,
      session.currentChatSettings,
      session.messages,
      session.sessionTitle,
      session.showThoughts,
      themeId,
    ]
  );

  const inputValue = useMemo(
    () => ({
      appSettings,
      currentChatSettings: session.currentChatSettings,
      setAppFileError,
      activeSessionId: session.activeSessionId,
      commandedInput,
      onMessageSent: inputActions.onMessageSent,
      selectedFiles,
      setSelectedFiles,
      onSendMessage: inputActions.onSendMessage,
      isLoading: session.isLoading,
      isEditing: session.isEditing,
      editMode,
      editingMessageId,
      setEditingMessageId,
      onStopGenerating: inputActions.onStopGenerating,
      onCancelEdit: inputActions.onCancelEdit,
      onProcessFiles: inputActions.onProcessFiles,
      onAddFileById: inputActions.onAddFileById,
      onCancelUpload: inputActions.onCancelUpload,
      onTranscribeAudio: inputActions.onTranscribeAudio,
      isProcessingFile,
      fileError,
      isImagenModel,
      isImageEditModel: features.isImageEditModel,
      aspectRatio,
      setAspectRatio,
      imageSize,
      setImageSize,
      imageOutputMode,
      setImageOutputMode,
      personGeneration,
      setPersonGeneration,
      isGoogleSearchEnabled: features.isGoogleSearchEnabled,
      onToggleGoogleSearch: inputActions.onToggleGoogleSearch,
      isCodeExecutionEnabled: features.isCodeExecutionEnabled,
      onToggleCodeExecution: inputActions.onToggleCodeExecution,
      isLocalPythonEnabled: features.isLocalPythonEnabled,
      onToggleLocalPython: inputActions.onToggleLocalPython,
      isUrlContextEnabled: features.isUrlContextEnabled,
      onToggleUrlContext: inputActions.onToggleUrlContext,
      isDeepSearchEnabled: features.isDeepSearchEnabled,
      onToggleDeepSearch: inputActions.onToggleDeepSearch,
      onClearChat: inputActions.onClearChat,
      onNewChat: header.onNewChat,
      onOpenSettings: inputActions.onOpenSettings,
      onToggleCanvasPrompt: inputActions.onToggleCanvasPrompt,
      onSelectModel: header.onSelectModel,
      availableModels: header.availableModels,
      onTogglePinCurrentSession: inputActions.onTogglePinCurrentSession,
      onRetryLastTurn: inputActions.onRetryLastTurn,
      onEditLastUserMessage: inputActions.onEditLastUserMessage,
      onTogglePip: header.onTogglePip,
      isPipActive: header.isPipActive,
      generateQuadImages: features.generateQuadImages,
      onToggleQuadImages: inputActions.onToggleQuadImages,
      setCurrentChatSettings: inputActions.setCurrentChatSettings,
      onSuggestionClick: messageActions.onSuggestionClick,
      onOrganizeInfoClick: messageActions.onOrganizeInfoClick,
      showEmptyStateSuggestions,
      onUpdateMessageContent: inputActions.onEditMessageContent,
      onAddUserMessage: inputActions.onAddUserMessage,
      onLiveTranscript: inputActions.onLiveTranscript,
      liveClientFunctions: inputActions.liveClientFunctions,
      onToggleBBox: inputActions.onToggleBBox,
      isBBoxModeActive: features.isBBoxModeActive,
      onToggleGuide: inputActions.onToggleGuide,
      isGuideModeActive: features.isGuideModeActive,
      themeId,
    }),
    [
      appSettings,
      aspectRatio,
      commandedInput,
      editMode,
      editingMessageId,
      features.generateQuadImages,
      features.isBBoxModeActive,
      features.isCodeExecutionEnabled,
      features.isDeepSearchEnabled,
      features.isGoogleSearchEnabled,
      features.isGuideModeActive,
      features.isImageEditModel,
      features.isLocalPythonEnabled,
      features.isUrlContextEnabled,
      fileError,
      header.availableModels,
      header.isPipActive,
      header.onNewChat,
      header.onSelectModel,
      header.onTogglePip,
      imageSize,
      imageOutputMode,
      inputActions,
      isImagenModel,
      isProcessingFile,
      messageActions.onOrganizeInfoClick,
      messageActions.onSuggestionClick,
      personGeneration,
      selectedFiles,
      session.activeSessionId,
      session.currentChatSettings,
      session.isEditing,
      session.isLoading,
      showEmptyStateSuggestions,
      setAppFileError,
      setAspectRatio,
      setEditingMessageId,
      setImageSize,
      setImageOutputMode,
      setPersonGeneration,
      setSelectedFiles,
      themeId,
    ],
  );

  const providerValue = useMemo(
    () => ({
      messageList: messageListValue,
      input: inputValue,
    }),
    [inputValue, messageListValue],
  );

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={shell.handleAppDragEnter}
      onDragOver={shell.handleAppDragOver}
      onDragLeave={shell.handleAppDragLeave}
      onDrop={shell.handleAppDrop}
    >
      <DragDropOverlay isDraggingOver={shell.isAppDraggingOver} />

      <Header
        onNewChat={header.onNewChat}
        onOpenScenariosModal={header.onOpenScenariosModal}
        onToggleHistorySidebar={header.onToggleHistorySidebar}
        isLoading={session.isLoading}
        currentModelName={header.currentModelName}
        availableModels={header.availableModels}
        selectedModelId={header.selectedModelId}
        onSelectModel={header.onSelectModel}
        isSwitchingModel={isSwitchingModel}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onLoadCanvasPrompt={header.onLoadCanvasPrompt}
        isCanvasPromptActive={header.isCanvasPromptActive}
        isCanvasPromptBusy={header.isCanvasPromptBusy}
        isPipSupported={header.isPipSupported}
        isPipActive={header.isPipActive}
        onTogglePip={header.onTogglePip}
        themeId={themeId}
        thinkingLevel={session.currentChatSettings.thinkingLevel}
        onSetThinkingLevel={header.onSetThinkingLevel}
        showThoughts={session.showThoughts}
        onToggleGemmaReasoning={header.onToggleGemmaReasoning}
        newChatShortcut={newChatShortcut}
        pipShortcut={pipShortcut}
      />

      <ModelsErrorDisplay error={shell.modelsLoadingError} />

      <ChatAreaProvider value={providerValue}>
        <MessageList />

        <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <ChatInput />
          </div>
        </div>
      </ChatAreaProvider>
    </div>
  );
};
