import React, { createContext, useContext } from 'react';
import type {
  AppSettings,
  ChatSettings,
  ChatMessage,
  InputCommand,
  LiveClientFunctions,
  ModelOption,
  SideViewContent,
  UploadedFile,
  VideoMetadata,
} from '../../../types';
import type { MediaResolution } from '../../../types/settings';

export interface ChatAreaMessageListContextValue {
  messages: ChatMessage[];
  sessionTitle?: string;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
  ) => void;
  showThoughts: boolean;
  themeId: string;
  baseFontSize: number;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onOrganizeInfoClick?: (suggestion: string) => void;
  onFollowUpSuggestionClick?: (suggestion: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;
  chatInputHeight: number;
  appSettings: AppSettings;
  currentModelId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  onQuote: (text: string) => void;
  onInsert?: (text: string) => void;
  activeSessionId: string | null;
}

export interface ChatAreaInputContextValue {
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: InputCommand | null;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
  isLoading: boolean;
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
  isLocalPythonEnabled?: boolean;
  onToggleLocalPython?: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  isPipActive?: boolean;
  isHistorySidebarOpen?: boolean;
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prevSettings: ChatSettings) => ChatSettings) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onOrganizeInfoClick?: (suggestion: string) => void;
  showEmptyStateSuggestions?: boolean;
  editMode: 'update' | 'resend';
  onUpdateMessageContent: (messageId: string, content: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
  ) => void;
  liveClientFunctions?: LiveClientFunctions;
  onToggleBBox?: () => void;
  isBBoxModeActive?: boolean;
  onToggleGuide?: () => void;
  isGuideModeActive?: boolean;
  themeId: string;
}

export interface ChatAreaProviderValue {
  messageList: ChatAreaMessageListContextValue;
  input: ChatAreaInputContextValue;
}

const ChatAreaMessageListContext = createContext<ChatAreaMessageListContextValue | null>(null);
const ChatAreaInputContext = createContext<ChatAreaInputContextValue | null>(null);

interface ChatAreaProviderProps {
  value: ChatAreaProviderValue;
  children: React.ReactNode;
}

export const ChatAreaProvider: React.FC<ChatAreaProviderProps> = ({ value, children }) => (
  <ChatAreaMessageListContext.Provider value={value.messageList}>
    <ChatAreaInputContext.Provider value={value.input}>{children}</ChatAreaInputContext.Provider>
  </ChatAreaMessageListContext.Provider>
);

function useRequiredContext<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${name} must be used within ChatAreaProvider`);
  }

  return value;
}

export const useChatAreaMessageList = () => useRequiredContext(ChatAreaMessageListContext, 'useChatAreaMessageList');

export const useChatAreaInput = () => useRequiredContext(ChatAreaInputContext, 'useChatAreaInput');

export interface ChatAreaHeaderProps {
  isLoading: boolean;
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isSwitchingModel: boolean;
  isHistorySidebarOpen: boolean;
  onNewChat: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  onLoadCanvasPrompt: () => void;
  isCanvasPromptActive: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  themeId: string;
  thinkingLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  newChatShortcut: string;
  pipShortcut: string;
}

export interface ChatAreaShellProps {
  isAppDraggingOver: boolean;
  handleAppDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  modelsLoadingError: string | null;
}
