import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, SavedChatSession, UploadedFile } from '../../types';
import { extractPersistedSessionFileRecords } from '../../utils/chat/session';
import { useDataExport } from './useDataExport';
import { useDataImport } from './useDataImport';

const mockGetAllSessions = vi.fn();

vi.mock('../../utils/db', () => ({
  dbService: {
    getAllSessions: (...args: unknown[]) => mockGetAllSessions(...args),
    addLogs: vi.fn().mockResolvedValue(undefined),
    pruneLogs: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/export/core', () => ({
  triggerDownload: vi.fn(),
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

describe('useDataExport history roundtrip', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalFileReader: typeof FileReader;
  let exportedJson = '';
  let createObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    exportedJson = '';
    originalCreateObjectURL = URL.createObjectURL;
    originalFileReader = globalThis.FileReader;

    vi.stubGlobal('alert', vi.fn());

    createObjectURLMock = vi.fn(() => 'blob:history-export');
    URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        this.result = exportedJson;
        this.onload?.({
          target: {
            result: this.result,
          },
        } as ProgressEvent<FileReader>);
      }

      readAsDataURL(blob: Blob) {
        blob
          .arrayBuffer()
          .then((buffer) => {
            const base64 = Buffer.from(buffer).toString('base64');
            this.result = `data:${blob.type};base64,${base64}`;
            this.onload?.({
              target: {
                result: this.result,
              },
            } as ProgressEvent<FileReader>);
          })
          .catch(() => {
            this.onerror?.({} as ProgressEvent<FileReader>);
          });
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    globalThis.FileReader = originalFileReader;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('preserves attachment payloads across export and import', async () => {
    const attachment: UploadedFile = {
      id: 'file-1',
      name: 'notes.txt',
      type: 'text/plain',
      size: 5,
      rawFile: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    };
    const exportedSession: SavedChatSession = {
      id: 'session-1',
      title: 'History',
      timestamp: Date.now(),
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'with file',
          timestamp: new Date('2026-04-20T08:00:00.000Z'),
          files: [attachment],
        },
      ],
      settings: {
        modelId: 'gemini-test',
      } as SavedChatSession['settings'],
    };

    mockGetAllSessions.mockResolvedValue([exportedSession]);

    const exportHook = renderHook(() =>
      useDataExport({
        appSettings: {} as AppSettings,
        savedGroups: [],
        savedScenarios: [],
        t: (key) => key,
      }),
    );

    await act(async () => {
      await exportHook.result.current.handleExportHistory();
    });
    expect(createObjectURLMock).toHaveBeenCalled();
    const exportedBlob = createObjectURLMock.mock.calls[0][0] as Blob;
    exportedJson = await exportedBlob.text();

    expect(exportedJson).toContain('"AllModelChat-History"');

    let importedSessions: SavedChatSession[] = [];
    const importHook = renderHook(() =>
      useDataImport({
        setAppSettings: vi.fn(),
        updateAndPersistSessions: vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
          importedSessions = updater(importedSessions);
        }),
        updateAndPersistGroups: vi.fn(),
        savedScenarios: [],
        handleSaveAllScenarios: vi.fn(),
        t: (key) => key,
      }),
    );

    act(() => {
      importHook.result.current.handleImportHistory(
        new File(['history'], 'all-model-chat-history.json', { type: 'application/json' }),
      );
    });

    expect(importedSessions).toHaveLength(1);
    expect(extractPersistedSessionFileRecords(importedSessions[0])).toHaveLength(1);

    exportHook.unmount();
    importHook.unmount();
  });
});
