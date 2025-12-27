
import React, { useCallback } from 'react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
import { ChatSettings, ChatMessage, UploadedFile, AppSettings, ModelOption, SideViewContent, VideoMetadata, InputCommand } from '../../types';
import { ThemeColors } from '../../constants/themeConstants';
import { translations } from '../../utils/appUtils';
import { MediaResolution } from '../../types/settings';
import { useChatInputHeight } from '../../hooks/chat-input/useChatInputHeight';
import { DragDropOverlay } from '../chat/overlays/DragDropOverlay';
import { ModelsErrorDisplay } from '../chat/overlays/ModelsErrorDisplay';

export interface ChatAreaProps {
  activeSessionId: string | null;
  sessionTitle?: string;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  // Drag & Drop
  isAppDraggingOver: boolean;
  isProcessingDrop?: boolean;
  handleAppDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (e: React.DragEvent<HTMLDivElement>) => void;

  // Header Props
  onNewChat: () => void;
  onOpenSettingsModal: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  isLoading: boolean;
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isSwitchingModel: boolean;
  isHistorySidebarOpen: boolean;
  onLoadCanvasPrompt: () => void;
  isCanvasPromptActive: boolean;
  isKeyLocked: boolean;
  themeId: string;
  onSetThinkingLevel: (level: 'LOW' | 'HIGH') => void;

  // Models Error
  modelsLoadingError: string | null;

  // MessageList Props
  messages: ChatMessage[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  showThoughts: boolean;
  themeColors: ThemeColors;
  baseFontSize: number;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onTextToSpeech: (messageId: string, text: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  ttsMessageId: string | null;
  language: 'en' | 'zh';
  scrollNavVisibility: { up: boolean; down: boolean };
  onScrollToPrevTurn: () => void;
  onScrollToNextTurn: () => void;
  
  // Edit Content
  onEditMessageContent: (message: ChatMessage) => void;
  onUpdateMessageFile: (messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;

  // ChatInput Props
  appSettings: AppSettings;
  commandedInput: InputCommand | null;
  setCommandedInput: (command: InputCommand | null) => void;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
  onSendMessage: (text: string) => void;
  isEditing: boolean;
  editMode: 'update' | 'resend';
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  isProcessingFile: boolean;
  fileError: string | null;
  isImagenModel?: boolean;
  isImageEditModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onEditLastUserMessage: () => void;
  onOpenLogViewer: () => void;
  onClearAllHistory: () => void;
  setCurrentChatSettings: (updater: (prevSettings: ChatSettings) => ChatSettings) => void;
  onUpdateMessageContent: (messageId: string, content: string) => void;

  // PiP Props
  isPipSupported: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;

  // Image Generation
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;

  // Side Panel
  onOpenSidePanel: (content: SideViewContent) => void;

  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ChatArea: React.FC<ChatAreaProps> = (props) => {
  const {
    activeSessionId, sessionTitle, currentChatSettings, setAppFileError,
    isAppDraggingOver, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel,
    isSwitchingModel, isHistorySidebarOpen, onLoadCanvasPrompt, isCanvasPromptActive,
    isKeyLocked, themeId, modelsLoadingError,
    messages, scrollContainerRef, setScrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled,
    onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, ttsMessageId, language, scrollNavVisibility,
    onScrollToPrevTurn, onScrollToNextTurn, onEditMessageContent, onUpdateMessageFile,
    appSettings, commandedInput, setCommandedInput, onMessageSent,
    selectedFiles, setSelectedFiles, onSendMessage, isEditing, editMode, editingMessageId, setEditingMessageId, onStopGenerating,
    onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isProcessingFile, fileError, isImageEditModel, aspectRatio, setAspectRatio, imageSize, setImageSize,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext, isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    isPipSupported, isPipActive, onTogglePip,
    generateQuadImages, onToggleQuadImages,
    onSetThinkingLevel, setCurrentChatSettings, onUpdateMessageContent,
    onOpenSidePanel,
    t
  } = props;

  // Extract logic to custom hook
  const { chatInputHeight, chatInputContainerRef } = useChatInputHeight();

  // Helper to determine model capabilities for UI logic
  const isImagenModel = currentChatSettings.modelId?.includes('imagen') || currentChatSettings.modelId?.includes('gemini-2.5-flash-image');

  const handleQuote = useCallback((text: string) => {
      setCommandedInput({ text: text, id: Date.now(), mode: 'quote' });
  }, [setCommandedInput]);

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={handleAppDragEnter}
      onDragOver={handleAppDragOver}
      onDragLeave={handleAppDragLeave}
      onDrop={handleAppDrop}
    >
      <DragDropOverlay isDraggingOver={isAppDraggingOver} t={t} />
      
      <Header
        onNewChat={onNewChat}
        onOpenSettingsModal={onOpenSettingsModal}
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
        t={t}
        isKeyLocked={isKeyLocked}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={onTogglePip}
        themeId={themeId}
        thinkingLevel={currentChatSettings.thinkingLevel}
        onSetThinkingLevel={onSetThinkingLevel}
      />

      <ModelsErrorDisplay error={modelsLoadingError} />

      <MessageList
        messages={messages}
        sessionTitle={sessionTitle}
        scrollContainerRef={scrollContainerRef}
        setScrollContainerRef={setScrollContainerRef}
        onScrollContainerScroll={onScrollContainerScroll}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onRetryMessage={onRetryMessage}
        onEditMessageContent={onEditMessageContent}
        showThoughts={showThoughts}
        themeColors={themeColors}
        themeId={themeId}
        baseFontSize={baseFontSize}
        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
        onSuggestionClick={onSuggestionClick}
        onOrganizeInfoClick={onOrganizeInfoClick}
        onFollowUpSuggestionClick={onFollowUpSuggestionClick}
        onTextToSpeech={onTextToSpeech}
        onGenerateCanvas={onGenerateCanvas}
        ttsMessageId={ttsMessageId}
        t={t}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={onScrollToPrevTurn}
        onScrollToNextTurn={onScrollToNextTurn}
        chatInputHeight={chatInputHeight}
        appSettings={appSettings}
        currentModelId={currentChatSettings.modelId} 
        onOpenSidePanel={onOpenSidePanel}
        onUpdateMessageFile={onUpdateMessageFile}
        onQuote={handleQuote}
      />

      <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInput
            appSettings={appSettings}
            currentChatSettings={currentChatSettings}
            setAppFileError={setAppFileError}
            activeSessionId={activeSessionId}
            commandedInput={commandedInput}
            onMessageSent={onMessageSent}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            isEditing={isEditing}
            editMode={editMode}
            editingMessageId={editingMessageId}
            setEditingMessageId={setEditingMessageId}
            onStopGenerating={onStopGenerating}
            onCancelEdit={onCancelEdit}
            onProcessFiles={onProcessFiles}
            onAddFileById={onAddFileById}
            onCancelUpload={onCancelUpload}
            onTranscribeAudio={onTranscribeAudio}
            isProcessingFile={isProcessingFile}
            fileError={fileError}
            isImagenModel={isImagenModel}
            isImageEditModel={isImageEditModel}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            imageSize={imageSize}
            setImageSize={setImageSize}
            t={t}
            isGoogleSearchEnabled={isGoogleSearchEnabled}
            onToggleGoogleSearch={onToggleGoogleSearch}
            isCodeExecutionEnabled={isCodeExecutionEnabled}
            onToggleCodeExecution={onToggleCodeExecution}
            isUrlContextEnabled={isUrlContextEnabled}
            onToggleUrlContext={onToggleUrlContext}
            isDeepSearchEnabled={isDeepSearchEnabled}
            onToggleDeepSearch={onToggleDeepSearch}
            onClearChat={onClearChat}
            onNewChat={onNewChat}
            onOpenSettings={onOpenSettings}
            onToggleCanvasPrompt={onToggleCanvasPrompt}
            onSelectModel={onSelectModel}
            availableModels={availableModels}
            onTogglePinCurrentSession={onTogglePinCurrentSession}
            onRetryLastTurn={onRetryLastTurn}
            onEditLastUserMessage={onEditLastUserMessage}
            onTogglePip={onTogglePip}
            isPipActive={isPipActive}
            isHistorySidebarOpen={isHistorySidebarOpen}
            generateQuadImages={generateQuadImages}
            onToggleQuadImages={onToggleQuadImages}
            setCurrentChatSettings={setCurrentChatSettings}
            onSuggestionClick={onSuggestionClick}
            onOrganizeInfoClick={onOrganizeInfoClick}
            showEmptyStateSuggestions={messages.length === 0}
            onUpdateMessageContent={onUpdateMessageContent}
          />
        </div>
      </div>
    </div>
  );
};
