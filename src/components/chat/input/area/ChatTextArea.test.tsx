import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import { ChatTextArea } from './ChatTextArea';

describe('ChatTextArea', () => {
  const renderer = setupTestRenderer();

  it('focuses the textarea when the shell is clicked', () => {
    const textareaRef = { current: null } as React.RefObject<HTMLTextAreaElement>;

    act(() => {
      renderer.root.render(
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

    const textarea = renderer.container.querySelector('textarea[data-chat-input-textarea="true"]');
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
      renderer.root.render(
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

    const textarea = renderer.container.querySelector<HTMLTextAreaElement>('textarea[data-chat-input-textarea="true"]');
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
