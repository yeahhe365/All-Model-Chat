import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageList } from './MessageList';
import { type ChatMessage, type UploadedFile } from '@/types';
import { createChatAreaProviderValue, renderWithChatAreaProviders } from '@/test/chatAreaFixtures';

const messagePropsSpy = vi.hoisted(() => vi.fn());

vi.mock('react-virtuoso', async () => {
  const { createVirtuosoMock } = await import('@/test/messageListTestDoubles');

  return createVirtuosoMock<ChatMessage>();
});

vi.mock('@/components/message/Message', async () => {
  const { createMessagePreviewButtonMock } = await import('@/test/messageListTestDoubles');

  return createMessagePreviewButtonMock(messagePropsSpy);
});

vi.mock('@/components/modals/FilePreviewModal', async () => {
  const { createFilePreviewModalMock } = await import('@/test/messageListTestDoubles');

  return createFilePreviewModalMock();
});

vi.mock('@/components/modals/MarkdownPreviewModal', async () => {
  const { createMarkdownPreviewModalMock } = await import('@/test/messageListTestDoubles');

  return createMarkdownPreviewModalMock();
});

vi.mock('./message-list/hooks/useMessageListScroll', async () => {
  const { createMessageListScrollMock } = await import('@/test/messageListTestDoubles');

  return createMessageListScrollMock();
});

vi.mock('./message-list/ScrollNavigation', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('ScrollNavigation');
});

vi.mock('./message-list/TextSelectionToolbar', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('TextSelectionToolbar');
});

vi.mock('./message-list/MessageListFooter', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('MessageListFooter');
});

vi.mock('./message-list/WelcomeScreen', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('WelcomeScreen');
});

describe('MessageList image preview', () => {
  let unmount: (() => void) | null;

  const file: UploadedFile = {
    id: 'file-1',
    name: 'demo.png',
    type: 'image/png',
    size: 128,
    dataUrl: 'blob:demo',
    uploadState: 'active',
  };

  const messages: ChatMessage[] = [
    {
      id: 'message-1',
      role: 'model',
      content: '',
      files: [file],
      timestamp: new Date('2026-04-10T00:00:00.000Z'),
    },
  ];

  const createProviderValue = (messageFiles: UploadedFile[] = [file]) =>
    createChatAreaProviderValue({
      messageList: {
        messages: [{ ...messages[0], files: messageFiles }],
        sessionTitle: 'Test',
        currentModelId: 'gemini-2.5-flash',
      },
    });

  beforeEach(() => {
    unmount = null;
  });

  afterEach(() => {
    unmount?.();
    vi.clearAllMocks();
  });

  it('shows the file preview after clicking an image', async () => {
    ({ unmount } = renderWithChatAreaProviders(<MessageList />, { value: createProviderValue() }));

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-testid="file-preview-modal"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="markdown-preview-modal"]')).not.toBeInTheDocument();
  });

  it('opens markdown files in the dedicated markdown preview modal', async () => {
    const markdownFile: UploadedFile = {
      id: 'markdown-1',
      name: 'notes.md',
      type: 'text/markdown',
      size: 128,
      textContent: '# Notes',
      uploadState: 'active',
    };

    ({ unmount } = renderWithChatAreaProviders(<MessageList />, { value: createProviderValue([markdownFile]) }));

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-testid="markdown-preview-modal"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="file-preview-modal"]')).not.toBeInTheDocument();
  });

  it('does not pass global display settings through MessageList to Message', () => {
    ({ unmount } = renderWithChatAreaProviders(<MessageList />, { value: createProviderValue() }));

    const props = messagePropsSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;

    expect(props).toBeDefined();
    expect(props).not.toHaveProperty('themeId');
    expect(props).not.toHaveProperty('baseFontSize');
    expect(props).not.toHaveProperty('expandCodeBlocksByDefault');
    expect(props).not.toHaveProperty('isMermaidRenderingEnabled');
    expect(props).not.toHaveProperty('isGraphvizRenderingEnabled');
    expect(props).not.toHaveProperty('appSettings');
  });

  it('sends a chat follow-up when a Live Artifact follow-up payload is received', () => {
    const onSendMessage = vi.fn();
    ({ unmount } = renderWithChatAreaProviders(<MessageList />, {
      value: createChatAreaProviderValue({
        messageList: {
          messages,
          sessionTitle: 'Test',
          currentModelId: 'gemini-2.5-flash',
        },
        input: { onSendMessage },
      }),
    }));

    const props = messagePropsSpy.mock.calls[0]?.[0] as
      | { onLiveArtifactFollowUp?: (payload: unknown) => void }
      | undefined;
    expect(props?.onLiveArtifactFollowUp).toBeTypeOf('function');

    act(() => {
      props?.onLiveArtifactFollowUp?.({
        instruction: '基于当前选择继续生成实施计划',
        state: { selected: '方案B' },
      });
    });

    const prompt = onSendMessage.mock.calls[0]?.[0] as string | undefined;
    expect(prompt).toContain('基于当前选择继续生成实施计划');
    expect(prompt).toContain('"selected": "方案B"');
  });
});
