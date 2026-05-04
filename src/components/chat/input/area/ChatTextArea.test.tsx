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

  it('does not overwrite browser-managed composition text during parent renders', () => {
    const textareaRef = { current: null } as React.RefObject<HTMLTextAreaElement>;
    const renderTextArea = (value: string) =>
      root.render(
        <ChatTextArea
          textareaRef={textareaRef}
          value={value}
          onChange={() => {}}
          onKeyDown={() => {}}
          onPaste={() => {}}
          onCompositionStart={() => {}}
          onCompositionEnd={() => {}}
          placeholder="Ask anything"
          disabled={false}
          isFullscreen={false}
          isMobile={false}
          initialTextareaHeight={44}
          isConverting={false}
        />,
      );

    act(() => {
      renderTextArea('');
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]');
    expect(textarea).not.toBeNull();

    act(() => {
      textarea?.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      if (textarea) {
        textarea.value = 'ni';
      }
      renderTextArea('');
    });

    expect(textarea?.value).toBe('ni');
  });
});
