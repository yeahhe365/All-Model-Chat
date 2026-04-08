import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../ChatInput';
import type { ChatInputAreaProps } from '../ChatInputArea';
import type { ChatInputProps } from '../../../../types';

const {
  capturedAreaProps,
  useChatInputLogicMock,
} = vi.hoisted(() => ({
  capturedAreaProps: { current: null as ChatInputAreaProps | null },
  useChatInputLogicMock: vi.fn(),
}));

vi.mock('../ChatInputArea', () => ({
  ChatInputArea: (props: ChatInputAreaProps) => {
    capturedAreaProps.current = props;
    return React.createElement('div');
  },
}));

vi.mock('../ChatInputModals', () => ({
  ChatInputModals: () => null,
}));

vi.mock('../ChatInputFileModals', () => ({
  ChatInputFileModals: () => null,
}));

vi.mock('../../../../hooks/chat-input/useChatInputLogic', () => ({
  useChatInputLogic: useChatInputLogicMock,
}));

vi.mock('../../../../stores/chatStore', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => selector({}),
}));

vi.mock('../../../../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => selector({}),
}));

const createProps = (): ChatInputProps => ({
  appSettings: {
    modelId: 'gemini-2.5-flash',
    temperature: 1,
    topP: 1,
    topK: 1,
    showThoughts: false,
    systemInstruction: '',
    ttsVoice: 'voice',
    thinkingBudget: 0,
    themeId: 'onyx',
    baseFontSize: 16,
    useCustomApiConfig: false,
    apiKey: null,
    apiProxyUrl: null,
    language: 'en',
    isStreamingEnabled: true,
    transcriptionModelId: 'gemini-2.0-flash',
    filesApiConfig: {
      images: true,
      pdfs: true,
      audio: true,
      video: true,
      text: true,
    },
    expandCodeBlocksByDefault: false,
    isAutoTitleEnabled: true,
    isMermaidRenderingEnabled: true,
    isCompletionNotificationEnabled: false,
    isSuggestionsEnabled: true,
    isAudioCompressionEnabled: false,
    autoCanvasModelId: 'gemini-2.5-flash',
    customShortcuts: {},
  },
  currentChatSettings: {
    modelId: 'gemini-2.5-flash',
    temperature: 1,
    topP: 1,
    topK: 1,
    showThoughts: false,
    systemInstruction: '',
    ttsVoice: 'voice',
    thinkingBudget: 0,
  },
  setAppFileError: vi.fn(),
  activeSessionId: 'session-1',
  commandedInput: null,
  onMessageSent: vi.fn(),
  selectedFiles: [],
  setSelectedFiles: vi.fn(),
  onSendMessage: vi.fn(),
  isLoading: false,
  isEditing: false,
  onStopGenerating: vi.fn(),
  onCancelEdit: vi.fn(),
  onProcessFiles: vi.fn(async () => {}),
  onAddFileById: vi.fn(async () => {}),
  onCancelUpload: vi.fn(),
  onTranscribeAudio: vi.fn(async () => null),
  isProcessingFile: false,
  fileError: null,
  t: ((key: string) => key) as ChatInputProps['t'],
  isGoogleSearchEnabled: false,
  onToggleGoogleSearch: vi.fn(),
  isCodeExecutionEnabled: false,
  onToggleCodeExecution: vi.fn(),
  isUrlContextEnabled: false,
  onToggleUrlContext: vi.fn(),
  isDeepSearchEnabled: false,
  onToggleDeepSearch: vi.fn(),
  onClearChat: vi.fn(),
  onNewChat: vi.fn(),
  onOpenSettings: vi.fn(),
  onToggleCanvasPrompt: vi.fn(),
  onTogglePinCurrentSession: vi.fn(),
  onRetryLastTurn: vi.fn(),
  onSelectModel: vi.fn(),
  availableModels: [],
  onEditLastUserMessage: vi.fn(),
  onTogglePip: vi.fn(),
  generateQuadImages: false,
  onToggleQuadImages: vi.fn(),
  setCurrentChatSettings: vi.fn(),
  editMode: 'update',
  onUpdateMessageContent: vi.fn(),
  editingMessageId: null,
  setEditingMessageId: vi.fn(),
  onAddUserMessage: vi.fn(),
  themeId: 'onyx',
});

describe('ChatInput', () => {
  it('wires slash command selection through slashCommandState', () => {
    const handleCommandSelect = vi.fn();

    useChatInputLogicMock.mockReturnValue({
      inputState: {
        fileIdInput: '',
        setFileIdInput: vi.fn(),
        textareaRef: { current: null },
        urlInput: '',
        setUrlInput: vi.fn(),
        isAddingById: false,
        isAddingByUrl: false,
        ttsContext: '',
        inputText: '/he',
        isWaitingForUpload: false,
        isTranslating: false,
        handleToggleFullscreen: vi.fn(),
        isFullscreen: false,
        quotes: [],
        setQuotes: vi.fn(),
        isAnimatingSend: false,
        isMobile: false,
        setTtsContext: vi.fn(),
      },
      capabilities: {
        isImagenModel: false,
        isGemini3ImageModel: false,
        isTtsModel: false,
        supportedAspectRatios: [],
        supportedImageSizes: [],
        isNativeAudioModel: false,
        isGemini3: false,
      },
      liveAPI: {
        connect: vi.fn(),
        isConnected: false,
        isMuted: false,
        toggleMute: vi.fn(),
        isSpeaking: false,
        volume: 0,
        error: null,
        disconnect: vi.fn(),
      },
      modalsState: {
        showAddByIdInput: false,
        setShowAddByIdInput: vi.fn(),
        showAddByUrlInput: false,
        setShowAddByUrlInput: vi.fn(),
        showRecorder: false,
        handleAudioRecord: vi.fn(),
        setShowRecorder: vi.fn(),
        showCreateTextFileEditor: false,
        setShowCreateTextFileEditor: vi.fn(),
        setEditingFile: vi.fn(),
        editingFile: null,
        isHelpModalOpen: false,
        setIsHelpModalOpen: vi.fn(),
        showTtsContextEditor: false,
        setShowTtsContextEditor: vi.fn(),
        fileInputRef: { current: null },
        imageInputRef: { current: null },
        folderInputRef: { current: null },
        zipInputRef: { current: null },
        cameraInputRef: { current: null },
        handleAttachmentAction: vi.fn(),
      },
      localFileState: {
        isConverting: false,
        showTokenModal: false,
        setShowTokenModal: vi.fn(),
        configuringFile: null,
        setConfiguringFile: vi.fn(),
        previewFile: null,
        setPreviewFile: vi.fn(),
        handleConfigureFile: vi.fn(),
        handlePreviewFile: vi.fn(),
        isPreviewEditable: false,
        handleSavePreviewTextFile: vi.fn(),
        handleSaveTextFile: vi.fn(),
      },
      voiceState: {
        handleVoiceInputClick: vi.fn(),
        handleCancelRecording: vi.fn(),
        isRecording: false,
        isMicInitializing: false,
        isTranscribing: false,
      },
      slashCommandState: {
        slashCommandState: {
          isOpen: true,
          filteredCommands: [
            {
              name: 'help',
              description: 'Show help',
              icon: 'help',
              action: vi.fn(),
            },
          ],
          selectedIndex: 0,
        },
        allCommandsForHelp: [],
        handleCommandSelect,
      },
      handlers: {
        handleAddFileByIdSubmit: vi.fn(),
        handleToggleToolAndFocus: vi.fn((toggle: () => void) => toggle()),
        handleAddUrl: vi.fn(),
        handleTranslate: vi.fn(),
        handleFastSubmit: vi.fn(),
        removeSelectedFile: vi.fn(),
        handleInputChange: vi.fn(),
        handleKeyDown: vi.fn(),
        handlePaste: vi.fn(),
        onCompositionStart: vi.fn(),
        onCompositionEnd: vi.fn(),
        handleFileChange: vi.fn(),
        handleFolderChange: vi.fn(),
        handleZipChange: vi.fn(),
        handleSubmit: vi.fn(),
        handleSaveFileConfig: vi.fn(),
        handlePrevImage: vi.fn(),
        handleNextImage: vi.fn(),
        currentImageIndex: 0,
        inputImages: [],
      },
      targetDocument: document,
      canSend: true,
      isAnyModalOpen: false,
    });

    renderToStaticMarkup(<ChatInput {...createProps()} />);

    expect(capturedAreaProps.current?.slashCommandProps.onSelect).toBe(handleCommandSelect);
  });
});
