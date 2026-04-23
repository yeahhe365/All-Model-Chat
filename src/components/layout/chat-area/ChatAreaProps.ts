import type { DragEvent } from 'react';
import type {
  ChatMessage,
  ChatSettings,
  LiveClientFunctions,
  ModelOption,
  SideViewContent,
  VideoMetadata,
} from '../../../types';
import type { UploadedFile } from '../../../types/chat';
import type { MediaResolution } from '../../../types/settings';

export interface ChatAreaSessionModel {
  activeSessionId: string | null;
  sessionTitle: string;
  currentChatSettings: ChatSettings;
  messages: ChatMessage[];
  isLoading: boolean;
  isEditing: boolean;
  showThoughts: boolean;
}

export interface ChatAreaShellModel {
  isAppDraggingOver: boolean;
  modelsLoadingError: string | null;
  handleAppDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export interface ChatAreaHeaderModel {
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  isCanvasPromptActive: boolean;
  isCanvasPromptBusy?: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  onNewChat: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  onLoadCanvasPrompt: () => void;
  onSelectModel: (modelId: string) => void;
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onToggleGemmaReasoning: () => void;
  onTogglePip: () => void;
}

export interface ChatAreaMessageActionsModel {
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution }
  ) => void;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export interface ChatAreaInputActionsModel {
  onMessageSent: () => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  onToggleGoogleSearch: () => void;
  onToggleCodeExecution: () => void;
  onToggleLocalPython?: () => void;
  onToggleUrlContext: () => void;
  onToggleDeepSearch: () => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onEditLastUserMessage: () => void;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prevSettings: ChatSettings) => ChatSettings) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
    generatedFiles?: UploadedFile[],
  ) => void;
  liveClientFunctions?: LiveClientFunctions;
  onEditMessageContent: (messageId: string, newContent: string) => void;
  onToggleBBox: () => void;
  onToggleGuide: () => void;
}

export interface ChatAreaFeaturesModel {
  isImageEditModel?: boolean;
  isBBoxModeActive: boolean;
  isGuideModeActive: boolean;
  generateQuadImages: boolean;
  isGoogleSearchEnabled: boolean;
  isCodeExecutionEnabled: boolean;
  isLocalPythonEnabled?: boolean;
  isUrlContextEnabled: boolean;
  isDeepSearchEnabled: boolean;
}

export interface ChatAreaModel {
  session: ChatAreaSessionModel;
  shell: ChatAreaShellModel;
  header: ChatAreaHeaderModel;
  messageActions: ChatAreaMessageActionsModel;
  inputActions: ChatAreaInputActionsModel;
  features: ChatAreaFeaturesModel;
}

export interface ChatAreaProps {
  chatArea: ChatAreaModel;
}
