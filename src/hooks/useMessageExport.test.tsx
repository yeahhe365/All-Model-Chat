import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../types';
import { renderHook } from '@/test/testUtils';
import { useMessageExport } from './useMessageExport';

const generateSnapshotPng = vi.fn();
const prepareElementForExport = vi.fn(async (element: HTMLElement) => element.cloneNode(true) as HTMLElement);
const exportHtmlStringAsFile = vi.fn();
const buildHtmlDocument = vi.fn(async () => '<html></html>');

vi.mock('../utils/export/runtime', () => ({
  buildMessageExportFilenameBase: vi.fn(() => 'message-export'),
  createExportDateMeta: vi.fn(() => ({ dateStr: '2026-05-09 10:00', isoDate: '2026-05-09' })),
  loadExportRuntime: vi.fn(async () => ({
    generateSnapshotPng,
    prepareElementForExport,
    exportHtmlStringAsFile,
    buildHtmlDocument,
  })),
}));

const message: ChatMessage = {
  id: 'message-123456',
  role: 'model',
  content: 'hello',
  timestamp: new Date('2026-05-09T02:00:00.000Z'),
};

describe('useMessageExport', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    generateSnapshotPng.mockReset();
    generateSnapshotPng.mockResolvedValue(undefined);
    prepareElementForExport.mockClear();
    exportHtmlStringAsFile.mockClear();
    buildHtmlDocument.mockClear();
  });

  it('does not report PNG success when snapshot generation cannot download the image', async () => {
    document.body.innerHTML = `
      <div data-message-id="message-123456">
        <div class="message-content-container">hello</div>
      </div>
    `;
    generateSnapshotPng.mockResolvedValueOnce(false);
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageExport({
        message,
        themeId: 'pearl',
      }),
    );

    await act(async () => {
      await result.current.handleExport('png', onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    unmount();
  });
});
