import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { createChatAreaProviderValue, createChatRuntimeValues } from '@/test/chatAreaFixtures';
import {
  createChatInputActionsContextValue,
  createChatInputComposerStatusContextValue,
} from '@/test/chatInputContextFixtures';
import { ChatRuntimeValuesProvider } from '@/components/layout/chat-runtime/ChatRuntimeContext';
import { ChatInputActionsContext, ChatInputComposerStatusContext } from '@/components/chat/input/ChatInputContext';

import { SendControls } from './SendControls';

describe('SendControls', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders the main send button slightly more compact than shared input controls', () => {
    const providerValue = createChatAreaProviderValue();

    act(() => {
      renderer.root.render(
        <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
          <ChatInputActionsContext.Provider value={createChatInputActionsContextValue()}>
            <ChatInputComposerStatusContext.Provider
              value={createChatInputComposerStatusContextValue({ hasTrimmedInput: true })}
            >
              <SendControls />
            </ChatInputComposerStatusContext.Provider>
          </ChatInputActionsContext.Provider>
        </ChatRuntimeValuesProvider>,
      );
    });

    const submitButton = renderer.container.querySelector('button[type="submit"]');

    expect(submitButton).not.toBeNull();
    expect(submitButton?.className).toContain('!h-10');
    expect(submitButton?.className).toContain('!w-10');
    expect(submitButton?.className).toContain('transition-colors');
    expect(submitButton?.className).not.toContain('duration-500');
  });

  it('lets the waiting-for-upload send button cancel the pending automatic send', () => {
    const onCancelPendingUploadSend = vi.fn();
    const providerValue = createChatAreaProviderValue();

    act(() => {
      renderer.root.render(
        <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
          <ChatInputActionsContext.Provider
            value={createChatInputActionsContextValue({
              isWaitingForUpload: true,
            })}
          >
            <ChatInputComposerStatusContext.Provider
              value={createChatInputComposerStatusContextValue({
                canSend: true,
                onCancelPendingUploadSend,
              })}
            >
              <SendControls />
            </ChatInputComposerStatusContext.Provider>
          </ChatInputActionsContext.Provider>
        </ChatRuntimeValuesProvider>,
      );
    });

    const button = renderer.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Cancel sending after upload"]',
    );

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);

    act(() => {
      button?.click();
    });

    expect(onCancelPendingUploadSend).toHaveBeenCalledTimes(1);
  });
});
