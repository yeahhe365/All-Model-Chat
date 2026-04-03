
import { ChatSettings, ChatMessage, ModelOption, SideViewContent, VideoMetadata } from '../../../types';
import { UploadedFile } from '../../../types/chat';
import { translations } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';

export interface ChatAreaProps {
  // IDs & Data — needed for ChatArea logic and child composition
  activeSessionId: string | null;
  sessionTitle?: string;
  currentChatSettings: ChatSettings;
  messages: ChatMessage[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  modelsLoadingError: string | null;

  // Computed values — derived from chatState/settings
  isLoading: boolean;
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  isCanvasPromptActive: boolean;
  isBBoxModeActive: boolean;
  isGuideModeActive: boolean;
  isKeyLocked: boolean;
  isEditing: boolean;
  isImagenModel?: boolean;
  isImageEditModel?: boolean;
  showThoughts: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  generateQuadImages: boolean;
  isGoogleSearchEnabled: boolean;
  isCodeExecutionEnabled: boolean;
  isLocalPythonEnabled?: boolean;
  isUrlContextEnabled: boolean;
  isDeepSearchEnabled: boolean;

  // Drag/drop state
  isAppDraggingOver: boolean;
  isProcessingDrop?: boolean;

  // All handlers (stable references via useStableCallback)
  handleAppDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onScrollContainerScroll: () => void;

  onNewChat: () => void;
  onOpenSettingsModal: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  onLoadCanvasPrompt: () => void;
  onToggleBBox: () => void;
  onToggleGuide: () => void;
  onSelectModel: (modelId: string) => void;
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;

  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  // Edit Content
  onEditMessageContent: (messageId: string, newContent: string) => void;
  onUpdateMessageFile: (messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;

  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onTextToSpeech: (messageId: string, text: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;

  onMessageSent: () => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
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

  onTogglePip: () => void;
  onToggleQuadImages: () => void;

  setCurrentChatSettings: (updater: (prevSettings: ChatSettings) => ChatSettings) => void;
  onOpenSidePanel: (content: SideViewContent) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;

  t: (key: keyof typeof translations, fallback?: string) => string;
}
