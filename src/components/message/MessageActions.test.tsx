import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../contexts/I18nContext';
import { MessageActions } from './MessageActions';
import { WindowProvider } from '../../contexts/WindowContext';
import type { ChatMessage } from '../../types';

vi.mock('./buttons/ExportMessageButton', () => ({
  ExportMessageButton: ({ className }: { className?: string }) => (
    <button type="button" className={className} aria-label="Export">
      Export
    </button>
  ),
}));

vi.mock('./buttons/MessageCopyButton', () => ({
  MessageCopyButton: ({ className }: { className?: string }) => (
    <button type="button" className={className} aria-label="Copy">
      Copy
    </button>
  ),
}));

describe('MessageActions', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  const message: ChatMessage = {
    id: 'message-1',
    role: 'model',
    content: 'Hello from the model',
    timestamp: new Date('2026-04-13T00:00:00.000Z'),
  };

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

  it('does not render a read-aloud action for model messages', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <WindowProvider window={window} document={document}>
            <MessageActions
              message={message}
              sessionTitle="Session"
              messageIndex={0}
              isGrouped={false}
              onEditMessage={() => {}}
              onDeleteMessage={() => {}}
              onRetryMessage={() => {}}
              onGenerateCanvas={() => {}}
              onContinueGeneration={() => {}}
              onForkMessage={() => {}}
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[aria-label="Read message aloud"]')).not.toBeInTheDocument();
  });

  it('shows the action column by default on mobile without relying on hover', () => {
    window.innerWidth = 390;

    act(() => {
      root.render(
        <I18nProvider>
          <WindowProvider window={window} document={document}>
            <MessageActions
              message={message}
              sessionTitle="Session"
              messageIndex={0}
              isGrouped={false}
              onEditMessage={() => {}}
              onDeleteMessage={() => {}}
              onRetryMessage={() => {}}
              onGenerateCanvas={() => {}}
              onContinueGeneration={() => {}}
              onForkMessage={() => {}}
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>,
      );
    });

    const actions = container.querySelector('.message-actions');
    expect(actions?.className).toContain('opacity-100');
    expect(actions?.className).not.toContain('opacity-0');
    expect(actions?.className).toContain('pointer-events-auto');
  });

  it('keeps compact message action buttons free of scale transforms', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <WindowProvider window={window} document={document}>
            <MessageActions
              message={message}
              sessionTitle="Session"
              messageIndex={0}
              isGrouped={false}
              onEditMessage={() => {}}
              onDeleteMessage={() => {}}
              onRetryMessage={() => {}}
              onGenerateCanvas={() => {}}
              onContinueGeneration={() => {}}
              onForkMessage={() => {}}
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>,
      );
    });

    const deleteButton = container.querySelector('button[aria-label="Delete"]');
    expect(deleteButton?.className).not.toContain('scale');
  });

  it('collapses continue generation and canvas actions into the message overflow menu', () => {
    const handleContinueGeneration = vi.fn();
    const handleGenerateCanvas = vi.fn();
    const handleForkMessage = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <WindowProvider window={window} document={document}>
            <MessageActions
              message={message}
              sessionTitle="Session"
              messageIndex={0}
              isGrouped={false}
              onEditMessage={() => {}}
              onDeleteMessage={() => {}}
              onRetryMessage={() => {}}
              onGenerateCanvas={handleGenerateCanvas}
              onContinueGeneration={handleContinueGeneration}
              onForkMessage={handleForkMessage}
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[aria-label="Continue Generating"]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label="Visualize with Canvas"]')).not.toBeInTheDocument();

    const moreButton = container.querySelector<HTMLButtonElement>('[aria-label="More message actions"]');
    expect(moreButton).toBeInTheDocument();
    expect(moreButton?.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      moreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(moreButton?.getAttribute('aria-expanded')).toBe('true');
    const menu = container.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();

    const continueItem = container.querySelector<HTMLButtonElement>(
      '[role="menuitem"][aria-label="Continue Generating"]',
    );
    const canvasItem = container.querySelector<HTMLButtonElement>(
      '[role="menuitem"][aria-label="Visualize with Canvas"]',
    );
    const forkItem = container.querySelector<HTMLButtonElement>('[role="menuitem"][aria-label="Fork from here"]');
    expect(continueItem).toBeInTheDocument();
    expect(canvasItem).toBeInTheDocument();
    expect(forkItem).toBeInTheDocument();

    act(() => {
      forkItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleForkMessage).toHaveBeenCalledWith('message-1');
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();

    act(() => {
      moreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const reopenedContinueItem = container.querySelector<HTMLButtonElement>(
      '[role="menuitem"][aria-label="Continue Generating"]',
    );

    act(() => {
      reopenedContinueItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleContinueGeneration).toHaveBeenCalledWith('message-1');
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();

    act(() => {
      moreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const reopenedCanvasItem = container.querySelector<HTMLButtonElement>(
      '[role="menuitem"][aria-label="Visualize with Canvas"]',
    );
    act(() => {
      reopenedCanvasItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleGenerateCanvas).toHaveBeenCalledWith('message-1', 'Hello from the model');
  });

  it('uses the custom assistant avatar image for model messages only', () => {
    const userMessage: ChatMessage = {
      ...message,
      id: 'message-2',
      role: 'user',
      content: 'Hello from the user',
    };

    act(() => {
      root.render(
        <I18nProvider>
          <WindowProvider window={window} document={document}>
            <>
              <MessageActions
                message={message}
                sessionTitle="Session"
                messageIndex={0}
                isGrouped={false}
                onEditMessage={() => {}}
                onDeleteMessage={() => {}}
                onRetryMessage={() => {}}
                onGenerateCanvas={() => {}}
                onContinueGeneration={() => {}}
                onForkMessage={() => {}}
                themeId="pearl"
              />
              <MessageActions
                message={userMessage}
                sessionTitle="Session"
                messageIndex={1}
                isGrouped={false}
                onEditMessage={() => {}}
                onDeleteMessage={() => {}}
                onRetryMessage={() => {}}
                onGenerateCanvas={() => {}}
                onContinueGeneration={() => {}}
                onForkMessage={() => {}}
                themeId="pearl"
              />
            </>
          </WindowProvider>
        </I18nProvider>,
      );
    });

    const assistantAvatar = container.querySelector<HTMLImageElement>('img[alt="Assistant avatar"]');

    expect(assistantAvatar).toBeInTheDocument();
    expect(assistantAvatar?.getAttribute('src')).toBe('/assets/assistant-avatar.png');
    expect(assistantAvatar?.className).toContain('object-contain');
    expect(assistantAvatar?.className).not.toContain('rounded-full');
    expect(container.querySelectorAll('img[alt="Assistant avatar"]')).toHaveLength(1);
  });
});
