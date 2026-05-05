import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, UploadedFile } from '../../types';
import { createChatAreaProviderValue } from '../../test/chatAreaFixtures';

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

const createProviderValue = () =>
  createChatAreaProviderValue({
    messageList: {
      messages,
      sessionTitle: 'Test',
      currentModelId: 'gemini-2.5-flash',
    },
  });

const mockedModuleIds = [
  'react-virtuoso',
  '../message/Message',
  '../modals/FilePreviewModal',
  '../modals/FileConfigurationModal',
  './message-list/hooks/useMessageListScroll',
  './message-list/ScrollNavigation',
  './message-list/TextSelectionToolbar',
  './message-list/MessageListFooter',
  './message-list/WelcomeScreen',
];

const loadMessageList = async (moduleLoadTracker: { count: number }) => {
  vi.resetModules();
  const {
    createFilePreviewModalMock,
    createMessageListScrollMock,
    createMessagePreviewButtonMock,
    createNullComponentMock,
    createVirtuosoMock,
  } = await import('../../test/messageListTestDoubles');

  vi.doMock('react-virtuoso', () => createVirtuosoMock<ChatMessage>());

  vi.doMock('../message/Message', () => createMessagePreviewButtonMock());

  vi.doMock('../modals/FilePreviewModal', () => {
    return createFilePreviewModalMock({
      onModuleLoad: () => {
        moduleLoadTracker.count += 1;
      },
    });
  });

  vi.doMock('../modals/FileConfigurationModal', () => createNullComponentMock('FileConfigurationModal'));

  vi.doMock('./message-list/hooks/useMessageListScroll', () => createMessageListScrollMock());

  vi.doMock('./message-list/ScrollNavigation', () => createNullComponentMock('ScrollNavigation'));

  vi.doMock('./message-list/TextSelectionToolbar', () => createNullComponentMock('TextSelectionToolbar'));

  vi.doMock('./message-list/MessageListFooter', () => createNullComponentMock('MessageListFooter'));

  vi.doMock('./message-list/WelcomeScreen', () => createNullComponentMock('WelcomeScreen'));

  const module = await import('./MessageList');
  const contextModule = await import('../layout/chat-area/ChatAreaContext');
  const i18nModule = await import('../../contexts/I18nContext');

  return {
    MessageList: module.MessageList,
    ChatAreaProvider: contextModule.ChatAreaProvider,
    I18nProvider: i18nModule.I18nProvider,
  };
};

describe('MessageList preview chunking', () => {
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.clearAllMocks();
    vi.resetModules();

    mockedModuleIds.forEach((moduleId) => {
      vi.doUnmock(moduleId);
    });
  });

  it('does not load the file preview modal module until the user opens a preview', async () => {
    const moduleLoadTracker = { count: 0 };
    const { MessageList, ChatAreaProvider, I18nProvider } = await loadMessageList(moduleLoadTracker);

    expect(moduleLoadTracker.count).toBe(0);

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue()}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(moduleLoadTracker.count).toBe(0);

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(moduleLoadTracker.count).toBe(1);
    expect(document.querySelector('[data-testid="file-preview-modal"]')).toBeInTheDocument();
  });
});
