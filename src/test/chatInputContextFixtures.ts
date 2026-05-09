import { vi } from 'vitest';
import { DEFAULT_APP_SETTINGS, DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import type {
  ChatInputActionsContextValue,
  ChatInputComposerStatusContextValue,
  ChatInputToolbarContextValue,
} from '../components/chat/input/ChatInputContext';
import { getModelCapabilities } from '../utils/modelHelpers';
import type { ChatToolToggleStates } from '../types/chatTools';

const createChatToolToggleStates = (overrides: ChatToolToggleStates = {}): ChatToolToggleStates => ({
  deepSearch: { isEnabled: false, onToggle: vi.fn() },
  googleSearch: { isEnabled: false, onToggle: vi.fn() },
  codeExecution: { isEnabled: false, onToggle: vi.fn() },
  localPython: { isEnabled: false, onToggle: vi.fn() },
  urlContext: { isEnabled: false, onToggle: vi.fn() },
  ...overrides,
});

export const createChatInputActionsContextValue = (
  overrides: Partial<ChatInputActionsContextValue> = {},
): ChatInputActionsContextValue => ({
  currentModelId: DEFAULT_CHAT_SETTINGS.modelId,
  toolStates: createChatToolToggleStates(),
  onAttachmentAction: vi.fn(),
  disabled: false,
  onRecordButtonClick: vi.fn(),
  isRecording: false,
  isMicInitializing: false,
  isTranscribing: false,
  onCancelRecording: vi.fn(),
  isWaitingForUpload: false,
  isTranslating: false,
  onToggleFullscreen: vi.fn(),
  isFullscreen: false,
  onStartLiveSession: vi.fn(),
  onDisconnectLiveSession: vi.fn(),
  isLiveConnected: false,
  isLiveMuted: false,
  onToggleLiveMute: vi.fn(),
  onStartLiveCamera: vi.fn(),
  onStartLiveScreenShare: vi.fn(),
  onStopLiveVideo: vi.fn(),
  liveVideoSource: null,
  onToggleToolAndFocus: vi.fn((toggle: () => void) => toggle()),
  onCountTokens: vi.fn(),
  isImageModel: false,
  isRealImagenModel: false,
  isNativeAudioModel: false,
  canAddYouTubeVideo: false,
  isLoading: false,
  isEditing: false,
  showInputTranslationButton: DEFAULT_APP_SETTINGS.showInputTranslationButton ?? false,
  showInputPasteButton: DEFAULT_APP_SETTINGS.showInputPasteButton ?? true,
  showInputClearButton: DEFAULT_APP_SETTINGS.showInputClearButton ?? false,
  ...overrides,
});

export const createChatInputComposerStatusContextValue = (
  overrides: Partial<ChatInputComposerStatusContextValue> = {},
): ChatInputComposerStatusContextValue => ({
  hasTrimmedInput: false,
  canSend: true,
  canQueueMessage: false,
  onTranslate: vi.fn(),
  onPasteFromClipboard: vi.fn(),
  onClearInput: vi.fn(),
  onFastSendMessage: vi.fn(),
  onQueueMessage: vi.fn(),
  onCancelPendingUploadSend: vi.fn(),
  ...overrides,
});

export const createChatInputToolbarContextValue = (
  overrides: Partial<ChatInputToolbarContextValue> = {},
): ChatInputToolbarContextValue => ({
  appSettings: DEFAULT_APP_SETTINGS,
  currentChatSettings: DEFAULT_CHAT_SETTINGS,
  capabilities: getModelCapabilities(DEFAULT_CHAT_SETTINGS.modelId),
  isLoading: false,
  setCurrentChatSettings: vi.fn(),
  onToggleQuadImages: vi.fn(),
  showAddByIdInput: false,
  fileIdInput: '',
  setFileIdInput: vi.fn(),
  onAddFileByIdSubmit: vi.fn(),
  onCancelAddById: vi.fn(),
  isAddingById: false,
  showAddByUrlInput: false,
  urlInput: '',
  setUrlInput: vi.fn(),
  onAddUrlSubmit: vi.fn(),
  onCancelAddUrl: vi.fn(),
  isAddingByUrl: false,
  onEditTtsContext: vi.fn(),
  ...overrides,
});
