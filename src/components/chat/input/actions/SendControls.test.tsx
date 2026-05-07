import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { createChatAreaProviderValue, createChatRuntimeValues } from '../../../../test/chatAreaFixtures';
import { ChatRuntimeValuesProvider } from '../../../layout/chat-runtime/ChatRuntimeContext';
import {
  ChatInputActionsContext,
  ChatInputComposerStatusContext,
  type ChatInputActionsContextValue,
  type ChatInputComposerStatusContextValue,
} from '../ChatInputContext';

import { SendControls } from './SendControls';

const actionsContextValue: ChatInputActionsContextValue = {
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
};

const composerStatusContextValue: ChatInputComposerStatusContextValue = {
  hasTrimmedInput: true,
  canSend: true,
  canQueueMessage: false,
  onTranslate: vi.fn(),
  onPasteFromClipboard: vi.fn(),
  onClearInput: vi.fn(),
  onFastSendMessage: vi.fn(),
  onQueueMessage: vi.fn(),
};

describe('SendControls', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders the main send button with a more compact size than the shared input controls', () => {
    const providerValue = createChatAreaProviderValue();

    act(() => {
      renderer.root.render(
        <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
          <ChatInputActionsContext.Provider value={actionsContextValue}>
            <ChatInputComposerStatusContext.Provider value={composerStatusContextValue}>
              <SendControls />
            </ChatInputComposerStatusContext.Provider>
          </ChatInputActionsContext.Provider>
        </ChatRuntimeValuesProvider>,
      );
    });

    const submitButton = renderer.container.querySelector('button[type="submit"]');

    expect(submitButton).not.toBeNull();
    expect(submitButton?.className).toContain('!h-9');
    expect(submitButton?.className).toContain('!w-9');
  });
});
