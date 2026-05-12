import { describe, expect, it, vi } from 'vitest';
import { render } from './testUtils';
import type { ChatMessage, UploadedFile } from '@/types';
import {
  createMessageListScrollMock,
  createMessagePreviewButtonMock,
  createVirtuosoMock,
} from './messageListTestDoubles';

describe('messageListTestDoubles', () => {
  it('renders Virtuoso items and reports received props', () => {
    const propsSpy = vi.fn();
    const { Virtuoso } = createVirtuosoMock<ChatMessage>(propsSpy);
    const messages: ChatMessage[] = [
      {
        id: 'message-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2026-04-10T00:00:00.000Z'),
      },
    ];

    render(
      <Virtuoso data={messages} itemContent={(_: number, message: ChatMessage) => <span>{message.content}</span>} />,
    );

    expect(document.querySelector('[data-testid="virtuoso"]')).toHaveTextContent('Hello');
    expect(propsSpy).toHaveBeenCalledWith(expect.objectContaining({ data: messages }));
  });

  it('opens the first message file from the preview button mock', () => {
    const file: UploadedFile = {
      id: 'file-1',
      name: 'demo.png',
      type: 'image/png',
      size: 128,
      dataUrl: 'blob:demo',
      uploadState: 'active',
    };
    const onImageClick = vi.fn();
    const { Message } = createMessagePreviewButtonMock();

    render(
      <Message
        message={{
          id: 'message-1',
          role: 'model',
          content: '',
          files: [file],
          timestamp: new Date('2026-04-10T00:00:00.000Z'),
        }}
        onImageClick={onImageClick}
      />,
    );

    document.querySelector<HTMLButtonElement>('[data-testid="open-preview-message-1"]')?.click();

    expect(onImageClick).toHaveBeenCalledWith(file);
  });

  it('provides a reusable no-op scroll hook result', () => {
    const { useMessageListScroll } = createMessageListScrollMock({ showScrollDown: true });

    expect(useMessageListScroll()).toEqual(
      expect.objectContaining({
        showScrollDown: true,
        showScrollUp: false,
        virtuosoRef: { current: null },
      }),
    );
  });
});
