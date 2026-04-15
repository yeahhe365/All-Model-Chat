import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
        <WindowProvider window={window} document={document}>
          <MessageActions
            message={message}
            isGrouped={false}
            onEditMessage={() => {}}
            onDeleteMessage={() => {}}
            onRetryMessage={() => {}}
            onGenerateCanvas={() => {}}
            onContinueGeneration={() => {}}
            themeId="pearl"
            t={(key) => String(key)}
          />
        </WindowProvider>
      );
    });

    expect(container.querySelector('[aria-label="Read message aloud"]')).not.toBeInTheDocument();
  });
});
