import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedChatSession, Theme } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { useChatSessionExport } from './useChatSessionExport';

const exportHtmlStringAsFile = vi.fn();
const exportTextStringAsFile = vi.fn();
const generateSnapshotPng = vi.fn();
const prepareElementForExport = vi.fn(async (element: HTMLElement) => element);
const buildHtmlDocument = vi.fn(async ({ contentHtml }: { contentHtml: string }) => contentHtml);
const buildTextDocument = vi.fn(() => 'txt export');

vi.mock('../../utils/export/runtime', () => ({
  buildChatExportFilename: vi.fn(() => 'chat-export.html'),
  createExportDateMeta: vi.fn(() => ({ dateStr: '4/26/2026 2:00:00 AM', isoDate: '2026-04-26' })),
  loadExportRuntime: vi.fn(async () => ({
    exportHtmlStringAsFile,
    exportTextStringAsFile,
    generateSnapshotPng,
    prepareElementForExport,
    buildHtmlDocument,
    buildTextDocument,
  })),
}));

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const makeSession = (): SavedChatSession => ({
  id: 'session-1',
  title: 'Long Chat',
  timestamp: Date.now(),
  settings: {
    ...DEFAULT_CHAT_SETTINGS,
    modelId: 'gemini-test',
  },
  messages: [
    {
      id: 'message-visible',
      role: 'user',
      content: 'currently mounted',
      timestamp: new Date('2026-04-26T00:00:00.000Z'),
    },
    {
      id: 'message-virtualized-away',
      role: 'model',
      content: 'not mounted in virtuoso',
      timestamp: new Date('2026-04-26T00:01:00.000Z'),
    },
  ],
});

describe('useChatSessionExport', () => {
  beforeEach(() => {
    exportHtmlStringAsFile.mockClear();
    exportTextStringAsFile.mockClear();
    generateSnapshotPng.mockClear();
    prepareElementForExport.mockClear();
    buildHtmlDocument.mockClear();
    buildTextDocument.mockClear();
  });

  it('exports HTML from all active chat messages instead of the virtualized scroll window', async () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.innerHTML = '<div data-message-id="message-visible">currently mounted</div>';
    const ref = { current: scrollContainer };

    const { result, unmount } = renderHook(() =>
      useChatSessionExport({
        activeChat: makeSession(),
        scrollContainerRef: ref,
        currentTheme: { id: 'pearl' } as Theme,
        language: 'en',
        t: (key) => key,
      }),
    );

    await act(async () => {
      await result.current.exportChatLogic('html');
    });

    const exportedElement = prepareElementForExport.mock.calls[0][0] as HTMLElement;
    expect(exportedElement.querySelector('[data-message-id="message-visible"]')).not.toBeNull();
    expect(exportedElement.querySelector('[data-message-id="message-virtualized-away"]')).not.toBeNull();
    expect(exportedElement.textContent).toContain('not mounted in virtuoso');

    unmount();
  });
});
