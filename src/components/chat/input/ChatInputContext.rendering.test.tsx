import React from 'react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithChatAreaProviders } from '@/test/chatAreaFixtures';
import { ChatInputProvider } from './ChatInputProvider';
import { useChatInputActionsContext, useChatInputContext } from './ChatInputContext';

describe('ChatInputContext rendering boundaries', () => {
  it('keeps action context consumers stable when input text changes but sendability does not', () => {
    const actionConsumerRenderSpy = vi.fn();
    const setInputTextRef: { current?: React.Dispatch<React.SetStateAction<string>> } = {};

    const ActionContextConsumer = React.memo(() => {
      useChatInputActionsContext();
      React.useEffect(() => {
        actionConsumerRenderSpy();
      });
      return null;
    });

    const TextController = () => {
      const { inputState } = useChatInputContext();
      React.useEffect(() => {
        setInputTextRef.current = inputState.setInputText;
      }, [inputState.setInputText]);
      return null;
    };

    renderWithChatAreaProviders(
      <ChatInputProvider>
        <ActionContextConsumer />
        <TextController />
      </ChatInputProvider>,
    );

    expect(actionConsumerRenderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      setInputTextRef.current?.('hello');
    });

    expect(actionConsumerRenderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      setInputTextRef.current?.('hello world');
    });

    expect(actionConsumerRenderSpy).toHaveBeenCalledTimes(1);
  });
});
