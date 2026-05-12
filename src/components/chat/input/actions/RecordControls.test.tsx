import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { createChatInputActionsContextValue } from '@/test/chatInputContextFixtures';
import { ChatInputActionsContext } from '@/components/chat/input/ChatInputContext';

import { RecordControls } from './RecordControls';

describe('RecordControls', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('reserves visible space for the recording pulse so adjacent controls do not cover it', () => {
    act(() => {
      renderer.root.render(
        <ChatInputActionsContext.Provider value={createChatInputActionsContextValue({ isRecording: true })}>
          <RecordControls />
        </ChatInputActionsContext.Provider>,
      );
    });

    const group = renderer.container.querySelector('[data-testid="record-controls-group"]');
    const recordButton = renderer.container.querySelector('button[aria-label="Stop recording"]');

    expect(group?.className).toContain('gap-3');
    expect(group?.className).toContain('pr-2.5');
    expect(group?.className).toContain('overflow-visible');
    expect(recordButton?.className).toContain('relative');
    expect(recordButton?.className).toContain('z-10');
    expect(recordButton?.className).toContain('mic-recording-animate');
  });

  it('keeps cancel recording wired while the recording button is active', () => {
    const onCancelRecording = vi.fn();

    act(() => {
      renderer.root.render(
        <ChatInputActionsContext.Provider
          value={createChatInputActionsContextValue({ isRecording: true, onCancelRecording })}
        >
          <RecordControls />
        </ChatInputActionsContext.Provider>,
      );
    });

    const cancelButton = renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Cancel recording"]');

    act(() => {
      cancelButton?.click();
    });

    expect(onCancelRecording).toHaveBeenCalledTimes(1);
  });
});
