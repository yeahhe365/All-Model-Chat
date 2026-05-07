import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '../../../test/storeTestUtils';
import { ChatInputActionsContext, type ChatInputActionsContextValue } from './ChatInputContext';

vi.mock('../../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('../../../hooks/ui/usePortaledMenu', () => ({
  usePortaledMenu: () => ({
    isOpen: true,
    menuPosition: {},
    containerRef: { current: null },
    buttonRef: { current: null },
    menuRef: { current: null },
    targetWindow: window,
    closeMenu: vi.fn(),
    toggleMenu: vi.fn(),
  }),
}));

import { AttachmentMenu } from './AttachmentMenu';

const createActionsContextValue = (
  overrides: Partial<ChatInputActionsContextValue> = {},
): ChatInputActionsContextValue => ({
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
  onToggleToolAndFocus: vi.fn(),
  onCountTokens: vi.fn(),
  isImageModel: false,
  isRealImagenModel: false,
  isNativeAudioModel: false,
  canAddYouTubeVideo: false,
  isLoading: false,
  ...overrides,
});

describe('AttachmentMenu', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  it('shows YouTube video attachment action when YouTube URLs are supported', () => {
    const onAction = vi.fn();

    act(() => {
      renderer.root.render(
        <ChatInputActionsContext.Provider
          value={createActionsContextValue({ onAttachmentAction: onAction, canAddYouTubeVideo: true })}
        >
          <AttachmentMenu />
        </ChatInputActionsContext.Provider>,
      );
    });

    const youtubeButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add YouTube Video'),
    );

    expect(youtubeButton).not.toBeUndefined();

    act(() => {
      youtubeButton?.click();
    });

    expect(onAction).toHaveBeenCalledWith('url');
  });

  it('shows only image-relevant actions for Gemini image models', () => {
    act(() => {
      renderer.root.render(
        <ChatInputActionsContext.Provider value={createActionsContextValue({ isImageModel: true })}>
          <AttachmentMenu />
        </ChatInputActionsContext.Provider>,
      );
    });

    expect(document.body.textContent).toContain('Upload from Device');
    expect(document.body.textContent).toContain('Gallery');
    expect(document.body.textContent).toContain('Take Photo');
    expect(document.body.textContent).toContain('Screenshot');
    expect(document.body.textContent).toContain('Add by File ID');

    expect(document.body.textContent).not.toContain('Import Folder (as Text)');
    expect(document.body.textContent).not.toContain('Import Zip (as Text)');
    expect(document.body.textContent).not.toContain('Record Audio');
    expect(document.body.textContent).not.toContain('Create Text File');
    expect(document.body.textContent).not.toContain('Add YouTube Video');
  });
});
