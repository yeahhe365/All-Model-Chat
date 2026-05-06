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

vi.mock('./AttachmentMenu', () => ({
  AttachmentMenu: (props: { disabled: boolean }) => {
    attachmentMenuMock(props);
    return <div data-testid="attachment-menu" data-disabled={String(props.disabled)} />;
  },
}));

vi.mock('./ToolsMenu', () => ({
  ToolsMenu: (props: unknown) => {
    toolsMenuMock(props);
    return null;
  },
}));

vi.mock('./actions/WebSearchToggle', () => ({
  WebSearchToggle: () => null,
}));

vi.mock('./actions/LiveControls', () => ({
  LiveControls: (props: unknown) => {
    liveControlsMock(props);
    return null;
  },
}));

vi.mock('./actions/RecordControls', () => ({
  RecordControls: () => null,
}));

vi.mock('./actions/UtilityControls', () => ({
  UtilityControls: (props: unknown) => {
    utilityControlsMock(props);
    return <div data-testid="utility-controls" />;
  },
}));

vi.mock('./actions/SendControls', () => ({
  SendControls: (props: unknown) => {
    sendControlsMock(props);
    return <div data-testid="send-controls" />;
  },
}));
vi.mock('../../../stores/modelCapabilitiesStore', () => ({
  getCachedModelCapabilities: () => mockCapabilities.value,
}));

import { ChatInputActions } from './ChatInputActions';

const baseProps = {
  onAttachmentAction: vi.fn(),
  disabled: false,
  onRecordButtonClick: vi.fn(),
  isRecording: false,
  isMicInitializing: false,
  isTranscribing: false,
  canSend: true,
  isWaitingForUpload: false,
  onCancelRecording: vi.fn(),
  onTranslate: vi.fn(),
  onPasteFromClipboard: vi.fn(),
  onClearInput: vi.fn(),
  isTranslating: false,
  inputText: '',
  onToggleFullscreen: vi.fn(),
  isFullscreen: false,
  onStartLiveSession: vi.fn(),
  isLiveConnected: false,
  isLiveMuted: false,
  onToggleLiveMute: vi.fn(),
  onDisconnectLiveSession: vi.fn(),
  onStartLiveCamera: vi.fn(),
  onStartLiveScreenShare: vi.fn(),
  onStopLiveVideo: vi.fn(),
  liveVideoSource: null as 'camera' | 'screen' | null,
  onFastSendMessage: vi.fn(),
  canQueueMessage: false,
  onQueueMessage: vi.fn(),
  onToggleToolAndFocus: vi.fn((toggle: () => void) => toggle()),
  onCountTokens: vi.fn(),
};

describe('ChatInputActions', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  const renderActions = (props: Partial<typeof baseProps> = {}) => {
    const providerValue = createChatAreaProviderValue();

    act(() => {
      renderer.root.render(
        <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
          <ChatInputActions {...baseProps} {...props} />
        </ChatRuntimeValuesProvider>,
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
        onStartLiveSession: baseProps.onStartLiveSession,
        onDisconnectLiveSession: baseProps.onDisconnectLiveSession,
        onStartLiveCamera: baseProps.onStartLiveCamera,
        onStartLiveScreenShare: baseProps.onStartLiveScreenShare,
        onStopLiveVideo: baseProps.onStopLiveVideo,
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
        onToggleFullscreen: baseProps.onToggleFullscreen,
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
