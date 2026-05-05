import React, { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { createChatAreaProviderValue } from '../../../test/chatAreaFixtures';
import {
  ChatAreaProvider,
  type ChatAreaProviderValue,
  useChatAreaInput,
  useChatAreaMessageList,
} from './ChatAreaContext';

const createProviderValue = () =>
  createChatAreaProviderValue({
    messageList: {
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'hello',
          timestamp: new Date('2026-04-11T00:00:00.000Z'),
        },
        {
          id: 'message-2',
          role: 'model',
          content: 'world',
          timestamp: new Date('2026-04-11T00:00:01.000Z'),
        },
      ],
      sessionTitle: 'Provider Test',
    },
  });

const HookProbe = () => {
  const messageList = useChatAreaMessageList();
  const input = useChatAreaInput();

  return (
    <div>
      <div data-testid="message-count">{String(messageList.messages.length)}</div>
      <div data-testid="input-model">{input.currentChatSettings.modelId}</div>
    </div>
  );
};

const OutsideProviderProbe = () => {
  useChatAreaMessageList();
  return null;
};

const MessageListRenderProbe = React.memo(({ onRender }: { onRender: () => void }) => {
  React.useEffect(() => {
    onRender();
  }, [onRender]);

  const { messages } = useChatAreaMessageList();

  return <div data-testid="render-probe">{messages.length}</div>;
});

describe('ChatAreaContext', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.clearAllMocks();
  });

  it('throws when a slice hook is used outside ChatAreaProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const suppressExpectedProviderError = (event: ErrorEvent) => {
      const message =
        event.error instanceof Error ? event.error.message : typeof event.message === 'string' ? event.message : '';

      if (message.includes('ChatAreaProvider')) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', suppressExpectedProviderError);

    try {
      expect(() => {
        act(() => {
          root.render(<OutsideProviderProbe />);
        });
      }).toThrow(/ChatAreaProvider/);
    } finally {
      window.removeEventListener('error', suppressExpectedProviderError);
      consoleErrorSpy.mockRestore();
    }
  });

  it('exposes the message-list and chat-input slices from one provider value', () => {
    const value = createProviderValue();

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={value}>
            <HookProbe />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="message-count"]')?.textContent).toBe('2');
    expect(container.querySelector('[data-testid="input-model"]')?.textContent).toBe('gemini-3.1-pro-preview');
  });

  it('does not re-render message-list consumers when only the input slice changes', () => {
    const initialValue = createProviderValue();
    const onRender = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={initialValue}>
            <MessageListRenderProbe onRender={onRender} />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(onRender).toHaveBeenCalledTimes(1);

    const updatedValue: ChatAreaProviderValue = {
      messageList: initialValue.messageList,
      input: {
        ...initialValue.input,
        commandedInput: { id: 1, mode: 'replace', text: 'typed text' },
      },
    };

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={updatedValue}>
            <MessageListRenderProbe onRender={onRender} />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(onRender).toHaveBeenCalledTimes(1);
  });
});
