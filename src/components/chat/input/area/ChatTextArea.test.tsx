import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatTextArea } from './ChatTextArea';

describe('ChatTextArea', () => {
  let container: HTMLDivElement;
  let root: Root;

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
  });

  it('focuses the textarea when the shell is clicked', () => {
    const textareaRef = { current: null } as React.RefObject<HTMLTextAreaElement>;

    act(() => {
      root.render(
        <ChatTextArea
          textareaRef={textareaRef}
          value=""
          onChange={() => {}}
          onKeyDown={() => {}}
          onPaste={() => {}}
          onCompositionStart={() => {}}
          onCompositionEnd={() => {}}
          placeholder="Ask anything"
          disabled={false}
          isFullscreen={false}
          isMobile={true}
          initialTextareaHeight={44}
          isConverting={false}
        />,
      );
    });

    const textarea = container.querySelector('textarea[aria-label="Chat message input"]');
    const shell = textarea?.parentElement;

    expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
    expect(shell).toBeInstanceOf(HTMLDivElement);
    expect(document.activeElement).not.toBe(textarea);

    act(() => {
      shell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.activeElement).toBe(textarea);
  });
});
