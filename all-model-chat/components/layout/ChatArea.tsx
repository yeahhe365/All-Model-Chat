
import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
import { useResponsiveValue } from '../../hooks/useDevice';
import { ChatSettings, ChatMessage, UploadedFile, AppSettings, ModelOption, SideViewContent } from '../../types';
import { ThemeColors } from '../../constants/themeConstants';
import { translations } from '../../utils/appUtils';

export interface ChatAreaProps {
  activeSessionId: string | null;
  sessionTitle?: string;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  // Drag & Drop
  isAppDraggingOver: boolean;
  isProcessingDrop?: boolean; // Added prop
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
  defaultModelId: string;
  onSetDefaultModel: (modelId: string) => void;
  themeId: string;
  onSetThinkingLevel: (level: 'LOW' | 'HIGH') => void;

  // Models Error
  modelsLoadingError: string | null;

  // MessageList Props
  messages: ChatMessage[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setScrollContainerRef: (node: HTMLDivElement | null) => void; // New prop
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string) => void;
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
  ttsMessageId: string | null;
  language: 'en' | 'zh';
  scrollNavVisibility: { up: boolean; down: boolean };
  onScrollToPrevTurn: () => void;
  onScrollToNextTurn: () => void;
  
  // Edit Content
  onEditMessageContent: (message: ChatMessage) => void;

  // ChatInput Props
  appSettings: AppSettings;
  commandedInput: { text: string; id: number } | null;
  setCommandedInput: (command: { text: string; id: number } | null) => void;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
  onSendMessage: (text: string) => void;
  isEditing: boolean;
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
    isAppDraggingOver, isProcessingDrop, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel,
    isSwitchingModel, isHistorySidebarOpen, onLoadCanvasPrompt, isCanvasPromptActive,
    isKeyLocked, defaultModelId, onSetDefaultModel, themeId, modelsLoadingError,
    messages, scrollContainerRef, setScrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled,
    onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, language, scrollNavVisibility,
    onScrollToPrevTurn, onScrollToNextTurn, onEditMessageContent,
    appSettings, commandedInput, setCommandedInput, onMessageSent,
    selectedFiles, setSelectedFiles, onSendMessage, isEditing, onStopGenerating,
    onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isProcessingFile, fileError, isImageEditModel, aspectRatio, setAspectRatio, imageSize, setImageSize,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext, isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    onOpenLogViewer, onClearAllHistory,
    isPipSupported, isPipActive, onTogglePip,
    generateQuadImages, onToggleQuadImages,
    onSetThinkingLevel, setCurrentChatSettings,
    onOpenSidePanel,
    t
  } = props;

  const [chatInputHeight, setChatInputHeight] = useState(160); // A reasonable default.
  const chatInputContainerRef = React.useRef<HTMLDivElement>(null);
  const dragIconSize = useResponsiveValue(48, 64);

  React.useEffect(() => {
    const chatInputEl = chatInputContainerRef.current;
    if (!chatInputEl) return;

    const resizeObserver = new ResizeObserver(() => {
        setChatInputHeight(chatInputEl.offsetHeight); 
    });

    resizeObserver.observe(chatInputEl);

    // Initial measurement
    setChatInputHeight(chatInputEl.offsetHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Determine if the model supports aspect ratio selection (Imagen models OR Gemini 2.5 Flash Image)
  const isImagenModel = currentChatSettings.modelId?.includes('imagen') || currentChatSettings.modelId?.includes('gemini-2.5-flash-image');

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={handleAppDragEnter}
      onDragOver={handleAppDragOver}
      onDragLeave={handleAppDragLeave}
      onDrop={handleAppDrop}
    >
      {isAppDraggingOver && (
        <div className="absolute inset-0 bg-[var(--theme-bg-accent)] bg-opacity-25 flex flex-col items-center justify-center pointer-events-none z-50 border-4 border-dashed border-[var(--theme-bg-accent)] rounded-lg m-1 sm:m-2 drag-overlay-animate backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
                <Paperclip size={dragIconSize} className="text-[var(--theme-bg-accent)] opacity-80 mb-2 sm:mb-4" />
                <p className="text-lg sm:text-2xl font-semibold text-[var(--theme-text-link)] text-center px-2">
                {t('appDragDropRelease')}
                </p>
                <p className="text-sm text-[var(--theme-text-primary)] opacity-80 mt-2">{t('appDragDropHelpText')}</p>
            </div>
        </div>
      )}
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
        defaultModelId={defaultModelId}
        onSetDefaultModel={onSetDefaultModel}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={onTogglePip}
        themeId={themeId}
        thinkingLevel={currentChatSettings.thinkingLevel}
        onSetThinkingLevel={onSetThinkingLevel}
      />
      {modelsLoadingError && (
        <div className="mx-2 my-1 p-2 text-sm text-center text-[var(--theme-text-danger)] bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md flex-shrink-0">{modelsLoadingError}</div>
      )}
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
        ttsMessageId={ttsMessageId}
        t={t}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={onScrollToPrevTurn}
        onScrollToNextTurn={onScrollToNextTurn}
        chatInputHeight={chatInputHeight}
        appSettings={appSettings}
        onOpenSidePanel={onOpenSidePanel}
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
            onSetDefaultModel={onSetDefaultModel}
            generateQuadImages={generateQuadImages}
            onToggleQuadImages={onToggleQuadImages}
            setCurrentChatSettings={setCurrentChatSettings}
            onSuggestionClick={onSuggestionClick}
            onOrganizeInfoClick={onOrganizeInfoClick}
            showEmptyStateSuggestions={messages.length === 0}
          />
        </div>
      </div>
    </div>
  );
};