import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
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
  let root: Root;

  const message: ChatMessage = {
    id: 'message-1',
    role: 'model',
    content: 'Hello from the model',
    timestamp: new Date('2026-04-13T00:00:00.000Z'),
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
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
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>
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
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>
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
              themeId="pearl"
            />
          </WindowProvider>
        </I18nProvider>
      );
    });

    const deleteButton = container.querySelector('button[aria-label="Delete"]');
    expect(deleteButton?.className).not.toContain('scale');
  });
});
