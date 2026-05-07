import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it } from 'vitest';
import { createChatAreaProviderValue, createChatRuntimeValues } from '../../../../test/chatAreaFixtures';
import {
  createChatInputActionsContextValue,
  createChatInputComposerStatusContextValue,
} from '../../../../test/chatInputContextFixtures';
import { ChatRuntimeValuesProvider } from '../../../layout/chat-runtime/ChatRuntimeContext';
import { ChatInputActionsContext, ChatInputComposerStatusContext } from '../ChatInputContext';

import { SendControls } from './SendControls';

describe('SendControls', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders the main send button with a more compact size than the shared input controls', () => {
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
    expect(submitButton?.className).toContain('!h-9');
    expect(submitButton?.className).toContain('!w-9');
  });
});
