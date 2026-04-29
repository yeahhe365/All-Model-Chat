import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const attachmentMenuMock = vi.fn();
const toolsMenuMock = vi.fn();
const liveControlsMock = vi.fn();
const utilityControlsMock = vi.fn();
const sendControlsMock = vi.fn();

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
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

import { ChatInputActions } from './ChatInputActions';

const baseProps = {
  onAttachmentAction: vi.fn(),
  disabled: false,
  isGoogleSearchEnabled: false,
  onToggleGoogleSearch: vi.fn(),
  isCodeExecutionEnabled: false,
  onToggleCodeExecution: vi.fn(),
  isLocalPythonEnabled: false,
  supportsBuiltInCustomToolCombination: true,
  onToggleLocalPython: vi.fn(),
  isUrlContextEnabled: false,
  onToggleUrlContext: vi.fn(),
  isDeepSearchEnabled: false,
  onToggleDeepSearch: vi.fn(),
  onAddYouTubeVideo: vi.fn(),
  onCountTokens: vi.fn(),
  onRecordButtonClick: vi.fn(),
  isRecording: false,
  isMicInitializing: false,
  isTranscribing: false,
  isLoading: false,
  onStopGenerating: vi.fn(),
  isEditing: false,
  onCancelEdit: vi.fn(),
  canSend: true,
  isWaitingForUpload: false,
  onCancelRecording: vi.fn(),
  onTranslate: vi.fn(),
  isTranslating: false,
  inputText: '',
  onToggleFullscreen: vi.fn(),
  isFullscreen: false,
  editMode: 'update' as const,
  isNativeAudioModel: false,
  onStartLiveSession: vi.fn(),
  isLiveConnected: false,
  isLiveMuted: false,
  onToggleLiveMute: vi.fn(),
  onDisconnectLiveSession: vi.fn(),
  onStartLiveCamera: vi.fn(),
  onStartLiveScreenShare: vi.fn(),
  onStopLiveVideo: vi.fn(),
  liveVideoSource: null,
  onFastSendMessage: vi.fn(),
  canQueueMessage: false,
  onQueueMessage: vi.fn(),
};

describe('ChatInputActions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    attachmentMenuMock.mockClear();
    toolsMenuMock.mockClear();
    liveControlsMock.mockClear();
    utilityControlsMock.mockClear();
    sendControlsMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('disables attachments for Imagen models', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isRealImagenModel />);
    });

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it('keeps attachments enabled for Gemini image models that support reference images', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isImageModel isGemini3ImageModel />);
    });

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it('keeps attachments enabled for Live models because selected files are sent through Live text turns', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isNativeAudioModel />);
    });

    expect(attachmentMenuMock).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it('forwards Live disconnect and video controls into the live controls', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isNativeAudioModel isLiveConnected liveVideoSource="camera" />);
    });

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

  it('forwards Gemma capability into the tools menu', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isGemmaModel />);
    });

    expect(toolsMenuMock).toHaveBeenCalledWith(expect.objectContaining({ isGemmaModel: true }));
  });

  it('forwards built-in/custom tool combination support into the tools menu', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} supportsBuiltInCustomToolCombination={false} />);
    });

    expect(toolsMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({ supportsBuiltInCustomToolCombination: false }),
    );
  });

  it('keeps auxiliary composer actions out of send controls so they can collapse into the compact menu', () => {
    act(() => {
      root.render(
        <ChatInputActions
          {...baseProps}
          inputText="Translate or send this"
          showInputTranslationButton
          showInputPasteButton
          showInputClearButton
          canQueueMessage
        />,
      );
    });

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
    expect(container.querySelector('[data-testid="composer-more-menu"]')).not.toBeNull();
  });
});
