import React, { useMemo } from 'react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/input/ChatInput';
import { DragDropOverlay } from '../chat/overlays/DragDropOverlay';
import { ModelsErrorDisplay } from '../chat/overlays/ModelsErrorDisplay';
import { useChatArea } from './chat-area/useChatArea';
import { getShortcutDisplay } from '../../utils/shortcutUtils';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatRuntimeStore } from '../../stores/chatRuntimeStore';
import { useChatState } from '../../hooks/chat/useChatState';

export const ChatArea: React.FC = () => {
  const appSettings = useSettingsStore((s) => s.appSettings);
  const themeId = useSettingsStore((s) => s.currentTheme.id);
  const { currentChatSettings, isLoading } = useChatState(appSettings);
  const isSwitchingModel = useChatStore((s) => s.isSwitchingModel);
  const isHistorySidebarOpen = useUIStore((s) => s.isHistorySidebarOpen);
  const isAppDraggingOver = useChatRuntimeStore((s) => s.isAppDraggingOver);
  const modelsLoadingError = useChatRuntimeStore((s) => s.modelsLoadingError);
  const handleAppDragEnter = useChatRuntimeStore((s) => s.handleAppDragEnter);
  const handleAppDragOver = useChatRuntimeStore((s) => s.handleAppDragOver);
  const handleAppDragLeave = useChatRuntimeStore((s) => s.handleAppDragLeave);
  const handleAppDrop = useChatRuntimeStore((s) => s.handleAppDrop);
  const currentModelName = useChatRuntimeStore((s) => s.currentModelName);
  const availableModels = useChatRuntimeStore((s) => s.availableModels);
  const selectedModelId = useChatRuntimeStore((s) => s.selectedModelId);
  const isCanvasPromptActive = useChatRuntimeStore((s) => s.isCanvasPromptActive);
  const isCanvasPromptBusy = useChatRuntimeStore((s) => s.isCanvasPromptBusy);
  const isPipSupported = useChatRuntimeStore((s) => s.isPipSupported);
  const isPipActive = useChatRuntimeStore((s) => s.isPipActive);
  const onNewChat = useChatRuntimeStore((s) => s.onNewChat);
  const onOpenScenariosModal = useChatRuntimeStore((s) => s.onOpenScenariosModal);
  const onToggleHistorySidebar = useChatRuntimeStore((s) => s.onToggleHistorySidebar);
  const onLoadCanvasPrompt = useChatRuntimeStore((s) => s.onLoadCanvasPrompt);
  const onSelectModel = useChatRuntimeStore((s) => s.onSelectModel);
  const onSetThinkingLevel = useChatRuntimeStore((s) => s.onSetThinkingLevel);
  const onToggleGemmaReasoning = useChatRuntimeStore((s) => s.onToggleGemmaReasoning);
  const onTogglePip = useChatRuntimeStore((s) => s.onTogglePip);
  const { chatInputContainerRef } = useChatArea();

  const newChatShortcut = useMemo(() => getShortcutDisplay('general.newChat', appSettings), [appSettings]);
  const pipShortcut = useMemo(() => getShortcutDisplay('general.togglePip', appSettings), [appSettings]);

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={handleAppDragEnter}
      onDragOver={handleAppDragOver}
      onDragLeave={handleAppDragLeave}
      onDrop={handleAppDrop}
    >
      <DragDropOverlay isDraggingOver={isAppDraggingOver} />

      <Header
        onNewChat={onNewChat}
        onOpenScenariosModal={onOpenScenariosModal}
        onToggleHistorySidebar={onToggleHistorySidebar}
        isLoading={isLoading}
        currentModelName={currentModelName}
        availableModels={availableModels}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
        isSwitchingModel={isSwitchingModel}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onLoadCanvasPrompt={onLoadCanvasPrompt}
        isCanvasPromptActive={isCanvasPromptActive}
        isCanvasPromptBusy={isCanvasPromptBusy}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={onTogglePip}
        themeId={themeId}
        thinkingLevel={currentChatSettings.thinkingLevel}
        onSetThinkingLevel={onSetThinkingLevel}
        showThoughts={currentChatSettings.showThoughts}
        onToggleGemmaReasoning={onToggleGemmaReasoning}
        newChatShortcut={newChatShortcut}
        pipShortcut={pipShortcut}
      />

      <ModelsErrorDisplay error={modelsLoadingError} />

      <MessageList />

      <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};
