import { create } from 'zustand';
import type { DragEvent } from 'react';
import type { Part } from '@google/genai';
import type {
  ChatSettingsUpdater,
  LiveClientFunctions,
  ModelOption,
  SideViewContent,
  UploadedFile,
  VideoMetadata,
} from '../types';
import type { MediaResolution } from '../types/settings';

type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

const noop = () => {};
const noopAsync = async () => null;

interface ChatRuntimeState {
  sessionTitle: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  currentModelName: string;
  isAppDraggingOver: boolean;
  modelsLoadingError: string | null;
  isCanvasPromptActive: boolean;
  isCanvasPromptBusy: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  chatInputHeight: number;
  liveClientFunctions?: LiveClientFunctions;
}

interface ChatRuntimeActions {
  setChatRuntime: (runtime: Partial<ChatRuntimeModel>) => void;
  resetChatRuntime: () => void;
  setChatInputHeight: (height: number) => void;
}

interface ChatRuntimeHandlers {
  handleAppDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (event: DragEvent<HTMLDivElement>) => void;
  onNewChat: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  onLoadCanvasPrompt: () => void;
  onSelectModel: (modelId: string) => void;
  onSetThinkingLevel: (level: ThinkingLevel) => void;
  onToggleGemmaReasoning: () => void;
  onTogglePip: () => void;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
  ) => void;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onForkMessage: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;
  onOpenSidePanel: (content: SideViewContent) => void;
  onMessageSent: () => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onEditLastUserMessage: () => void;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: ChatSettingsUpdater;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
    generatedFiles?: UploadedFile[],
    apiPart?: Part,
  ) => void;
  onEditMessageContent: (messageId: string, content: string) => void;
  onToggleBBox: () => void;
  onToggleGuide: () => void;
}

export type ChatRuntimeModel = ChatRuntimeState & ChatRuntimeHandlers;

const initialChatRuntime: ChatRuntimeModel = {
  sessionTitle: '',
  availableModels: [],
  selectedModelId: '',
  currentModelName: '',
  isAppDraggingOver: false,
  modelsLoadingError: null,
  isCanvasPromptActive: false,
  isCanvasPromptBusy: false,
  isPipSupported: false,
  isPipActive: false,
  chatInputHeight: 160,
  handleAppDragEnter: noop,
  handleAppDragOver: noop,
  handleAppDragLeave: noop,
  handleAppDrop: noop,
  onNewChat: noop,
  onOpenScenariosModal: noop,
  onToggleHistorySidebar: noop,
  onLoadCanvasPrompt: noop,
  onSelectModel: noop,
  onSetThinkingLevel: noop,
  onToggleGemmaReasoning: noop,
  onTogglePip: noop,
  setScrollContainerRef: noop,
  onEditMessage: noop,
  onDeleteMessage: noop,
  onRetryMessage: noop,
  onUpdateMessageFile: noop,
  onSuggestionClick: noop,
  onOrganizeInfoClick: noop,
  onFollowUpSuggestionClick: noop,
  onGenerateCanvas: noop,
  onContinueGeneration: noop,
  onForkMessage: noop,
  onQuickTTS: noopAsync,
  onOpenSidePanel: noop,
  onMessageSent: noop,
  onSendMessage: noop,
  onStopGenerating: noop,
  onCancelEdit: noop,
  onProcessFiles: async () => {},
  onAddFileById: async () => {},
  onCancelUpload: noop,
  onTranscribeAudio: noopAsync,
  onClearChat: noop,
  onOpenSettings: noop,
  onToggleCanvasPrompt: noop,
  onTogglePinCurrentSession: noop,
  onRetryLastTurn: noop,
  onEditLastUserMessage: noop,
  onToggleQuadImages: noop,
  setCurrentChatSettings: noop,
  onAddUserMessage: noop,
  onEditMessageContent: noop,
  onToggleBBox: noop,
  onToggleGuide: noop,
};

export const useChatRuntimeStore = create<ChatRuntimeModel & ChatRuntimeActions>((set) => ({
  ...initialChatRuntime,
  setChatRuntime: (runtime) => set(runtime),
  resetChatRuntime: () => set(initialChatRuntime),
  setChatInputHeight: (height) => set({ chatInputHeight: height }),
}));
