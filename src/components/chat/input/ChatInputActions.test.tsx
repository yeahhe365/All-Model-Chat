import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const attachmentMenuMock = vi.fn();
const toolsMenuMock = vi.fn();

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
  LiveControls: () => null,
}));

vi.mock('./actions/RecordControls', () => ({
  RecordControls: () => null,
}));

vi.mock('./actions/UtilityControls', () => ({
  UtilityControls: () => null,
}));

vi.mock('./actions/SendControls', () => ({
  SendControls: () => null,
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

    expect(attachmentMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('keeps attachments enabled for Gemini image models that support reference images', () => {
    act(() => {
      root.render(
        <ChatInputActions
          {...baseProps}
          isImageModel
          isGemini3ImageModel
        />,
      );
    });

    expect(attachmentMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('forwards Gemma capability into the tools menu', () => {
    act(() => {
      root.render(<ChatInputActions {...baseProps} isGemmaModel />);
    });

    expect(toolsMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({ isGemmaModel: true }),
    );
  });
});
