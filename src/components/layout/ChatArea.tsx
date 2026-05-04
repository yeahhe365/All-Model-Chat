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
  const { session, shell, header, messageActions, inputActions, features } = chatArea;

  // Read values from stores directly (no longer passed as props)
  const appSettings = useSettingsStore((s) => s.appSettings);
  const themeId = useSettingsStore((s) => s.currentTheme.id);
  const isSwitchingModel = useChatStore((s) => s.isSwitchingModel);
  const isHistorySidebarOpen = useUIStore((s) => s.isHistorySidebarOpen);
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
      onSuggestionClick: messageActions.onSuggestionClick,
      onOrganizeInfoClick: messageActions.onOrganizeInfoClick,
      onFollowUpSuggestionClick: messageActions.onFollowUpSuggestionClick,
      onGenerateCanvas: messageActions.onGenerateCanvas,
      onContinueGeneration: messageActions.onContinueGeneration,
      onForkMessage: messageActions.onForkMessage,
      onQuickTTS: messageActions.onQuickTTS,
      chatInputHeight,
      currentModelId: session.currentChatSettings.modelId,
      onOpenSidePanel: messageActions.onOpenSidePanel,
      onQuote: handleQuote,
      onInsert: handleInsert,
      activeSessionId: session.activeSessionId,
    }),
    [
      chatInputHeight,
      handleInsert,
      handleQuote,
      messageActions,
      session.activeSessionId,
      session.currentChatSettings,
      session.messages,
      session.sessionTitle,
      session.showThoughts,
    ],
  );

  const inputValue = useMemo(
    () => ({
      currentChatSettings: session.currentChatSettings,
      onMessageSent: inputActions.onMessageSent,
      onSendMessage: inputActions.onSendMessage,
      isLoading: session.isLoading,
      isEditing: session.isEditing,
      onStopGenerating: inputActions.onStopGenerating,
      onCancelEdit: inputActions.onCancelEdit,
      onProcessFiles: inputActions.onProcessFiles,
      onAddFileById: inputActions.onAddFileById,
      onCancelUpload: inputActions.onCancelUpload,
      onTranscribeAudio: inputActions.onTranscribeAudio,
      isImagenModel,
      isImageEditModel: features.isImageEditModel,
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
    }),
    [
      features.generateQuadImages,
      features.isBBoxModeActive,
      features.isGuideModeActive,
      features.isImageEditModel,
      header.availableModels,
      header.isPipActive,
      header.onNewChat,
      header.onSelectModel,
      header.onTogglePip,
      inputActions,
      isImagenModel,
      messageActions.onOrganizeInfoClick,
      messageActions.onSuggestionClick,
      session.currentChatSettings,
      session.isEditing,
      session.isLoading,
      showEmptyStateSuggestions,
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
