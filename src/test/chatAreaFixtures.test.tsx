import { describe, expect, it, vi } from 'vitest';
import { useChatAreaInput, useChatAreaMessageList } from '../contexts/ChatAreaContext';
import type { ChatMessage } from '../types';
import { createChatAreaProps, createChatAreaProviderValue, renderWithChatAreaProviders } from './chatAreaFixtures';

describe('chat area test fixtures', () => {
  it('builds a complete ChatAreaProviderValue with targeted overrides', () => {
    const messages: ChatMessage[] = [
      {
        id: 'message-1',
        role: 'user',
        content: 'hello',
        timestamp: new Date('2026-05-01T00:00:00.000Z'),
      },
    ];
    const onSendMessage = vi.fn();

    const value = createChatAreaProviderValue({
      messageList: {
        messages,
      },
      input: {
        isEditing: true,
        onSendMessage,
      },
    });

    expect(value.messageList.messages).toBe(messages);
    expect(value.messageList.sessionTitle).toBe('Test');
    expect(value.input.currentChatSettings.modelId).toBe('gemini-3.1-pro-preview');
    expect(value.input.isEditing).toBe(true);
    expect(value.input.onSendMessage).toBe(onSendMessage);
  });

  it('renders children inside I18n, Window, and ChatArea providers', () => {
    const Probe = () => {
      const messageList = useChatAreaMessageList();
      const input = useChatAreaInput();

      return (
        <div>
          <div data-testid="message-count">{messageList.messages.length}</div>
          <div data-testid="active-session">{input.activeSessionId}</div>
        </div>
      );
    };

    const { container, unmount } = renderWithChatAreaProviders(<Probe />, {
      chatArea: {
        messageList: {
          messages: [
            {
              id: 'message-1',
              role: 'model',
              content: 'world',
              timestamp: new Date('2026-05-01T00:00:00.000Z'),
            },
          ],
        },
        input: {
          activeSessionId: 'session-from-test',
        },
      },
    });

    expect(container.querySelector('[data-testid="message-count"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-testid="active-session"]')?.textContent).toBe('session-from-test');

    unmount();
  });

  it('builds complete ChatArea props with focused nested overrides', () => {
    const onSendMessage = vi.fn();

    const props = createChatAreaProps({
      session: {
        activeSessionId: 'session-from-props',
        messages: [],
      },
      inputActions: {
        onSendMessage,
      },
      features: {
        isImageEditModel: true,
      },
    });

    expect(props.chatArea.session.activeSessionId).toBe('session-from-props');
    expect(props.chatArea.session.messages).toEqual([]);
    expect(props.chatArea.inputActions.onSendMessage).toBe(onSendMessage);
    expect(props.chatArea.features.isImageEditModel).toBe(true);
    expect(props.chatArea.header.selectedModelId).toBe('gemini-3.1-pro-preview');
  });
});
