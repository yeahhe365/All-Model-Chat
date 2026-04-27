/* eslint-disable react-refresh/only-export-components */
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
} from '../types';
import type { ImageOutputMode, ImagePersonGeneration, MediaResolution } from '../types/settings';

interface ChatAreaMessageListContextValue {
  messages: ChatMessage[];
  sessionTitle: string;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
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

interface ChatAreaInputContextValue {
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: InputCommand | null;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
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
  imageOutputMode?: ImageOutputMode;
  setImageOutputMode?: (mode: ImageOutputMode) => void;
  personGeneration?: ImagePersonGeneration;
  setPersonGeneration?: (mode: ImagePersonGeneration) => void;
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
    generatedFiles?: UploadedFile[],
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
