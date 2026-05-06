import React, { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { setTestMatchMedia } from '@/test/browserEnvironment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatAreaProviderValue, applyChatAreaProviderValue } from '../../test/chatAreaFixtures';
import { useChatStore } from '../../stores/chatStore';
import { ChatArea } from './ChatArea';

const dispatchTouchEvent = (
  node: Element,
  type: 'touchstart' | 'touchend',
  touches: Array<{ clientX: number; clientY: number }>,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: type === 'touchend' ? [] : touches,
  });
  Object.defineProperty(event, 'changedTouches', {
    configurable: true,
    value: touches,
  });
  node.dispatchEvent(event);
};

vi.mock('../header/Header', () => ({
  Header: ({ currentModelName }: { currentModelName: string }) => (
    <div data-testid="header">{currentModelName || 'no-model'}</div>
  ),
}));

vi.mock('../chat/overlays/DragDropOverlay', () => ({
  DragDropOverlay: ({ isDraggingOver }: { isDraggingOver: boolean }) => (
    <div data-testid="drag-overlay">{String(isDraggingOver)}</div>
  ),
}));

vi.mock('../chat/overlays/ModelsErrorDisplay', () => ({
  ModelsErrorDisplay: ({ error }: { error: string | null }) => <div data-testid="models-error">{error}</div>,
}));

vi.mock('../chat/MessageList', () => ({
  MessageList: React.memo(() => {
    const messages = useChatStore((state) => state.activeMessages);
    return <div data-testid="message-list">{messages.length}</div>;
  }),
}));

vi.mock('../chat/input/ChatInput', () => ({
  ChatInput: React.memo(() => {
    const commandedInput = useChatStore((state) => state.commandedInput);
    return <div data-testid="chat-input">{commandedInput?.text ?? 'empty'}</div>;
  }),
}));

describe('ChatArea', () => {
  const renderer = setupTestRenderer();
  let matchMediaMatches = false;
  let windowInnerWidth = 1024;
  const virtualKeyboardShow = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: windowInnerWidth,
    });
    setTestMatchMedia(matchMediaMatches);
    Object.defineProperty(window.navigator, 'virtualKeyboard', {
      configurable: true,
      value: {
        show: virtualKeyboardShow,
      },
    });
    virtualKeyboardShow.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    renderer.root.unmount();
  });

  it('renders layout data from stores and runtime actions without ChatArea props', () => {
    applyChatAreaProviderValue(
      createChatAreaProviderValue({
        messageList: {
          messages: [
            {
              id: 'message-1',
              role: 'user',
              content: 'hello',
              timestamp: new Date('2026-04-12T00:00:00.000Z'),
            },
          ],
        },
        input: {
          commandedInput: {
            id: 1,
            mode: 'replace',
            text: 'store input',
          },
        },
      }),
    );

    act(() => {
      renderer.root.render(<ChatArea />);
    });

    expect(renderer.container.querySelector('[data-testid="message-list"]')?.textContent).toBe('1');
    expect(renderer.container.querySelector('[data-testid="chat-input"]')?.textContent).toBe('store input');
  });

  it('keeps the pointer-enabled composer layer constrained so the message scrollbar remains reachable', () => {
    applyChatAreaProviderValue(createChatAreaProviderValue());

    act(() => {
      renderer.root.render(<ChatArea />);
    });

    const input = renderer.container.querySelector('[data-testid="chat-input"]');
    const pointerLayer = input?.parentElement;

    expect(pointerLayer?.className).toContain('pointer-events-auto');
    expect(pointerLayer?.className).toContain('max-w-[44.8rem]');
    expect(pointerLayer?.className).toContain('mx-auto');
  });

  it('does not focus the composer after a downward swipe in the chat area on mobile', () => {
    matchMediaMatches = true;
    windowInnerWidth = 390;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: windowInnerWidth,
    });
    applyChatAreaProviderValue(createChatAreaProviderValue());

    const composer = document.createElement('textarea');
    composer.setAttribute('aria-label', 'Chat message input');
    composer.value = 'Draft message';
    document.body.appendChild(composer);
    const focusSpy = vi.spyOn(composer, 'focus');
    const selectionSpy = vi.spyOn(composer, 'setSelectionRange');

    act(() => {
      renderer.root.render(<ChatArea />);
    });

    const chatArea = renderer.container.querySelector('.chat-bg-enhancement');
    expect(chatArea).not.toBeNull();

    act(() => {
      dispatchTouchEvent(chatArea!, 'touchstart', [{ clientX: 100, clientY: 160 }]);
      dispatchTouchEvent(chatArea!, 'touchend', [{ clientX: 102, clientY: 250 }]);
    });

    expect(focusSpy).not.toHaveBeenCalled();
    expect(selectionSpy).not.toHaveBeenCalled();
    expect(virtualKeyboardShow).not.toHaveBeenCalled();
  });
});
