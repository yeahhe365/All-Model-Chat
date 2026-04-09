import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { ChatInput, ChatInputProps } from '../ChatInput';

const mockHandleCommandSelect = vi.fn();
const mockChatInputArea = vi.fn((_props?: unknown) => null);

vi.mock('../../../../stores/chatStore', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      selectedFiles: undefined,
      setSelectedFiles: undefined,
      editingMessageId: undefined,
      setEditingMessageId: undefined,
      editMode: undefined,
      commandedInput: undefined,
      setCommandedInput: vi.fn(),
      aspectRatio: undefined,
      setAspectRatio: undefined,
      imageSize: undefined,
      setImageSize: undefined,
      isAppProcessingFile: undefined,
      appFileError: undefined,
      setAppFileError: undefined,
    }),
}));

vi.mock('../../../../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      appSettings: undefined,
    }),
}));

vi.mock('../../../../hooks/chat-input/useChatInputLogic', () => ({
  useChatInputLogic: () => ({
    inputState: {
      fileIdInput: '',
      setFileIdInput: vi.fn(),
      urlInput: '',
      setUrlInput: vi.fn(),
      textareaRef: { current: null },
      isAddingById: false,
      isAddingByUrl: false,
      ttsContext: '',
      inputText: '/help',
      isWaitingForUpload: false,
      isTranslating: false,
      isFullscreen: false,
      isAnimatingSend: false,
      isMobile: false,
      quotes: [],
      setQuotes: vi.fn(),
      onCompositionStart: vi.fn(),
      onCompositionEnd: vi.fn(),
      handleToggleFullscreen: vi.fn(),
      setTtsContext: vi.fn(),
    },
    capabilities: {
      isImagenModel: false,
      isGemini3ImageModel: false,
      isTtsModel: false,
      isNativeAudioModel: false,
      isGemini3: false,
      supportedAspectRatios: [],
      supportedImageSizes: [],
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
      handleAttachmentAction: vi.fn(),
      showRecorder: false,
      handleAudioRecord: vi.fn(),
      setShowRecorder: vi.fn(),
      showCreateTextFileEditor: false,
      setShowCreateTextFileEditor: vi.fn(),
      setEditingFile: vi.fn(),
      isHelpModalOpen: false,
      setIsHelpModalOpen: vi.fn(),
      showTtsContextEditor: false,
      setShowTtsContextEditor: vi.fn(),
      editingFile: null,
      fileInputRef: { current: null },
      imageInputRef: { current: null },
      folderInputRef: { current: null },
      zipInputRef: { current: null },
      cameraInputRef: { current: null },
    },
    localFileState: {
      isConverting: false,
      setShowTokenModal: vi.fn(),
      handleConfigureFile: vi.fn(),
      handlePreviewFile: vi.fn(),
      handleSaveTextFile: vi.fn(),
      configuringFile: null,
      setConfiguringFile: vi.fn(),
      showTokenModal: false,
      previewFile: null,
      setPreviewFile: vi.fn(),
      isPreviewEditable: false,
      handleSavePreviewTextFile: vi.fn(),
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
            description: 'Open help',
            icon: 'help',
            action: vi.fn(),
          },
        ],
        selectedIndex: 0,
      },
      allCommandsForHelp: [],
      handleCommandSelect: mockHandleCommandSelect,
    },
    handlers: {
      handleAddFileByIdSubmit: vi.fn(),
      handleAddUrl: vi.fn(),
      handleToggleToolAndFocus: (toggleFn?: () => void) => toggleFn?.(),
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
      currentImageIndex: -1,
      inputImages: [],
    },
    targetDocument: document,
    canSend: true,
    isAnyModalOpen: false,
    handleSmartSendMessage: vi.fn(),
  }),
}));

vi.mock('../ChatInputArea', () => ({
  ChatInputArea: (props: unknown) => mockChatInputArea(props),
}));

vi.mock('../ChatInputModals', () => ({
  ChatInputModals: () => null,
}));

vi.mock('../ChatInputFileModals', () => ({
  ChatInputFileModals: () => null,
}));

describe('ChatInput', () => {
  let container: HTMLDivElement;
  let root: Root;

  const baseProps: ChatInputProps = {
    appSettings: {
      isSystemAudioRecordingEnabled: false,
      isPasteRichTextAsMarkdownEnabled: true,
    } as ChatInputProps['appSettings'],
    currentChatSettings: {
      modelId: 'gemini-2.5-flash',
      ttsVoice: 'Aoede',
      mediaResolution: 'MEDIA_RESOLUTION_LOW',
      thinkingLevel: 'LOW',
    } as ChatInputProps['currentChatSettings'],
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
    onProcessFiles: vi.fn(),
    onAddFileById: vi.fn(),
    onCancelUpload: vi.fn(),
    onTranscribeAudio: vi.fn(),
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
    themeId: 'pearl',
  };

  beforeEach(() => {
    mockHandleCommandSelect.mockReset();
    mockChatInputArea.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('wires slash command selection to the slash command handler', () => {
    act(() => {
      root.render(<ChatInput {...baseProps} />);
    });

    expect(mockChatInputArea).toHaveBeenCalled();
    const renderedProps = mockChatInputArea.mock.calls[0]?.[0] as unknown as {
      slashCommandProps: { onSelect: (command: unknown) => void };
    };

    const command = { name: 'help' };
    renderedProps.slashCommandProps.onSelect(command);

    expect(mockHandleCommandSelect).toHaveBeenCalledWith(command);
  });
});
