
import { ChatSettings, ChatMessage, UploadedFile, AppSettings, ModelOption, SideViewContent, VideoMetadata, InputCommand } from '../../../types';
import { ThemeColors } from '../../../constants/themeConstants';
import { translations } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';

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
  onToggleBBox: () => void;
  isBBoxModeActive: boolean;
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
  onContinueGeneration: (messageId: string) => void;
  ttsMessageId: string | null;
  onQuickTTS: (text: string) => Promise<string | null>;
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
  onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
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
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  
  onLiveTranscript: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;

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
