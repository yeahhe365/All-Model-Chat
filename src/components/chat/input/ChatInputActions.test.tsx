import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../../stores/chatStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { createChatAreaProviderValue, createChatRuntimeValues } from '../../../test/chatAreaFixtures';
import { createAppSettings } from '../../../test/factories';
import { ChatRuntimeValuesProvider } from '../../layout/chat-runtime/ChatRuntimeContext';

const attachmentMenuMock = vi.fn();
const toolsMenuMock = vi.fn();
const liveControlsMock = vi.fn();
const utilityControlsMock = vi.fn();
const sendControlsMock = vi.fn();
const mockCapabilities = vi.hoisted(() => ({
  value: {
    isImagenModel: false,
    isRealImagenModel: false,
    isNativeAudioModel: false,
  },
}));

vi.mock('./AttachmentMenu', async () => {
  const { useChatInputActionsContext } =
    await vi.importActual<typeof import('./ChatInputContext')>('./ChatInputContext');

  return {
    AttachmentMenu: () => {
      const { disabled, isRealImagenModel } = useChatInputActionsContext();
      const props = { disabled: disabled || isRealImagenModel };

      attachmentMenuMock(props);
      return <div data-testid="attachment-menu" data-disabled={String(props.disabled)} />;
    },
  };
});

vi.mock('./ToolsMenu', () => ({
  ToolsMenu: (props: unknown) => {
    toolsMenuMock(props);
    return null;
  },
}));

vi.mock('./actions/WebSearchToggle', () => ({
  WebSearchToggle: () => null,
}));

vi.mock('./actions/LiveControls', async () => {
  const { useChatInputActionsContext } =
    await vi.importActual<typeof import('./ChatInputContext')>('./ChatInputContext');

  return {
    LiveControls: () => {
      const props = useChatInputActionsContext();
      liveControlsMock(props);
      return null;
    },
  };
});

vi.mock('./actions/RecordControls', () => ({
  RecordControls: () => null,
}));

vi.mock('./actions/UtilityControls', async () => {
  const { useChatInputActionsContext } =
    await vi.importActual<typeof import('./ChatInputContext')>('./ChatInputContext');
  const { useSettingsStore } =
    await vi.importActual<typeof import('../../../stores/settingsStore')>('../../../stores/settingsStore');

  return {
    UtilityControls: () => {
      const { onToggleFullscreen } = useChatInputActionsContext();
      const showTranslateButton = useSettingsStore(
        (state) => state.appSettings.showInputTranslationButton ?? false,
      );
      utilityControlsMock({ showTranslateButton, onToggleFullscreen });
      return <div data-testid="utility-controls" />;
    },
  };
});

vi.mock('./actions/SendControls', async () => {
  const { useChatInputComposerStatusContext } =
    await vi.importActual<typeof import('./ChatInputContext')>('./ChatInputContext');

  return {
    SendControls: () => {
      const { canSend, canQueueMessage, onFastSendMessage, onQueueMessage } =
        useChatInputComposerStatusContext();
      const props = { canSend, canQueueMessage, onFastSendMessage, onQueueMessage };
      sendControlsMock(props);
      return <div data-testid="send-controls" />;
    },
  };
});

vi.mock('../../../stores/modelCapabilitiesStore', () => ({
  getCachedModelCapabilities: () => mockCapabilities.value,
}));

import {
  ChatInputActionsContext,
  ChatInputComposerStatusContext,
  type ChatInputActionsContextValue,
  type ChatInputComposerStatusContextValue,
} from './ChatInputContext';
import { ChatInputActions } from './ChatInputActions';

const baseActionsContext: ChatInputActionsContextValue = {
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
};

const baseComposerStatusContext: ChatInputComposerStatusContextValue = {
  hasTrimmedInput: false,
  canSend: true,
  canQueueMessage: false,
  onTranslate: vi.fn(),
  onPasteFromClipboard: vi.fn(),
  onClearInput: vi.fn(),
  onFastSendMessage: vi.fn(),
  onQueueMessage: vi.fn(),
};

type ActionRenderOverrides = Partial<ChatInputActionsContextValue> &
  Partial<ChatInputComposerStatusContextValue> & {
    inputText?: string;
  };

const splitRenderOverrides = (overrides: ActionRenderOverrides) => {
  const {
    inputText,
    hasTrimmedInput,
    canSend,
    canQueueMessage,
    onTranslate,
    onPasteFromClipboard,
    onClearInput,
    onFastSendMessage,
    onQueueMessage,
    ...actionOverrides
  } = overrides;

  return {
    actionOverrides,
    composerOverrides: {
      ...(hasTrimmedInput !== undefined ? { hasTrimmedInput } : {}),
      ...(inputText !== undefined ? { hasTrimmedInput: inputText.trim().length > 0 } : {}),
      ...(canSend !== undefined ? { canSend } : {}),
      ...(canQueueMessage !== undefined ? { canQueueMessage } : {}),
      ...(onTranslate !== undefined ? { onTranslate } : {}),
      ...(onPasteFromClipboard !== undefined ? { onPasteFromClipboard } : {}),
      ...(onClearInput !== undefined ? { onClearInput } : {}),
      ...(onFastSendMessage !== undefined ? { onFastSendMessage } : {}),
      ...(onQueueMessage !== undefined ? { onQueueMessage } : {}),
    },
  };
};

describe('ChatInputActions', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  const renderActions = (props: ActionRenderOverrides = {}) => {
    const providerValue = createChatAreaProviderValue();
    const { actionOverrides, composerOverrides } = splitRenderOverrides(props);
    const actionsValue: ChatInputActionsContextValue = {
      ...baseActionsContext,
      isImageModel: mockCapabilities.value.isImagenModel,
      isRealImagenModel: mockCapabilities.value.isRealImagenModel,
      isNativeAudioModel: mockCapabilities.value.isNativeAudioModel,
      ...actionOverrides,
    };
    const composerStatusValue: ChatInputComposerStatusContextValue = {
      ...baseComposerStatusContext,
      ...composerOverrides,
    };

    act(() => {
      renderer.root.render(
        <ChatInputActionsContext.Provider value={actionsValue}>
          <ChatInputComposerStatusContext.Provider value={composerStatusValue}>
            <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
              <ChatInputActions />
            </ChatRuntimeValuesProvider>
          </ChatInputComposerStatusContext.Provider>
        </ChatInputActionsContext.Provider>,
      );
    });
  };

  const mockActionRowMeasurements = ({
    containerWidth,
    leftWidth,
    rightWidth,
  }: {
    containerWidth: number;
    leftWidth: number;
    rightWidth: number;
  }) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const testId = this.getAttribute('data-testid');
      const widthByTestId: Record<string, number> = {
        'chat-input-actions-root': containerWidth,
        'chat-input-actions-left': leftWidth,
        'chat-input-actions-right': rightWidth,
      };
      const width = testId ? widthByTestId[testId] : undefined;

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width ?? 0,
        bottom: 40,
        width: width ?? 0,
        height: 40,
        toJSON: () => {},
      } as DOMRect;
    });
  };

  const waitForActionRowMeasurement = async () => {
    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  };

  beforeEach(() => {
    useSettingsStore.setState({
      appSettings: createAppSettings({
        modelId: 'gemini-3.1-pro-preview',
        showInputTranslationButton: false,
        showInputPasteButton: true,
        showInputClearButton: false,
      }),
    });
    useChatStore.setState({
      activeSessionId: null,
      savedSessions: [],
      activeMessages: [],
      editingMessageId: null,
      editMode: 'update',
      loadingSessionIds: new Set(),
    });
    mockCapabilities.value = {
      isImagenModel: false,
      isRealImagenModel: false,
      isNativeAudioModel: false,
    };
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    attachmentMenuMock.mockClear();
    toolsMenuMock.mockClear();
    liveControlsMock.mockClear();
    utilityControlsMock.mockClear();
    sendControlsMock.mockClear();
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    vi.restoreAllMocks();
  });

  it('disables attachments for Imagen models', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isImagenModel: true,
      isRealImagenModel: true,
    };

    renderActions();

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it('keeps attachments enabled for Gemini image models that support reference images', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isImagenModel: true,
      isRealImagenModel: false,
    };

    renderActions();

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it('keeps attachments enabled for Live models because selected files are sent through Live text turns', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isNativeAudioModel: true,
    };

    renderActions();

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it('forwards Live disconnect and video controls into the live controls', () => {
    mockCapabilities.value = {
      ...mockCapabilities.value,
      isNativeAudioModel: true,
    };

    renderActions({ isLiveConnected: true, liveVideoSource: 'camera' });

    expect(liveControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isLiveConnected: true,
        onStartLiveSession: baseActionsContext.onStartLiveSession,
        onDisconnectLiveSession: baseActionsContext.onDisconnectLiveSession,
        onStartLiveCamera: baseActionsContext.onStartLiveCamera,
        onStartLiveScreenShare: baseActionsContext.onStartLiveScreenShare,
        onStopLiveVideo: baseActionsContext.onStopLiveVideo,
        liveVideoSource: 'camera',
      }),
    );
  });

  it('forwards only the current model id into the tools menu for capability derivation', () => {
    useSettingsStore.setState({
      appSettings: createAppSettings({ modelId: 'gemma-3-27b-it' }),
    });

    renderActions();

    expect(toolsMenuMock).toHaveBeenCalledWith(expect.objectContaining({ currentModelId: 'gemma-3-27b-it' }));
    expect(toolsMenuMock.mock.calls[0]?.[0]).not.toHaveProperty('isGemmaModel');
    expect(toolsMenuMock.mock.calls[0]?.[0]).not.toHaveProperty('supportsBuiltInCustomToolCombination');
    expect(toolsMenuMock.mock.calls[0]?.[0]).not.toHaveProperty('isGemini3ImageModel');
  });

  it('keeps auxiliary composer actions direct when the single action row has enough room', async () => {
    mockActionRowMeasurements({ containerWidth: 500, leftWidth: 88, rightWidth: 292 });

    useSettingsStore.setState({
      appSettings: createAppSettings({
        modelId: 'gemini-3.1-pro-preview',
        showInputTranslationButton: true,
        showInputPasteButton: true,
        showInputClearButton: true,
      }),
    });
    renderActions({ inputText: 'Translate or send this', canQueueMessage: true });
    await waitForActionRowMeasurement();

    expect(utilityControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showTranslateButton: true,
        onToggleFullscreen: baseActionsContext.onToggleFullscreen,
      }),
    );
    expect(sendControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canQueueMessage: true,
      }),
    );
    expect(sendControlsMock.mock.calls[0]?.[0]).not.toHaveProperty('onPasteFromClipboard');
    expect(sendControlsMock.mock.calls[0]?.[0]).not.toHaveProperty('onClearInput');
    expect(sendControlsMock.mock.calls[0]?.[0]).not.toHaveProperty('showInputPasteButton');
    expect(sendControlsMock.mock.calls[0]?.[0]).not.toHaveProperty('showInputClearButton');
    expect(renderer.container.querySelector('[data-testid="clear-input-button"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="paste-button"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="composer-more-menu"]')).toBeNull();
  });

  it('moves auxiliary composer actions into the more menu only when the direct row overflows', async () => {
    mockActionRowMeasurements({ containerWidth: 300, leftWidth: 88, rightWidth: 292 });

    useSettingsStore.setState({
      appSettings: createAppSettings({
        modelId: 'gemini-3.1-pro-preview',
        showInputTranslationButton: true,
        showInputPasteButton: true,
        showInputClearButton: true,
      }),
    });
    renderActions({ inputText: 'Translate or send this', canQueueMessage: true });
    await waitForActionRowMeasurement();

    expect(sendControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canQueueMessage: true,
      }),
    );
    expect(renderer.container.querySelector('[data-testid="clear-input-button"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="paste-button"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="composer-more-menu"]')).not.toBeNull();
  });
});
