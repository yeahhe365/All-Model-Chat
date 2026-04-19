import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatGroup, SavedChatSession } from '../../types';
import { useDataImport } from './useDataImport';

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

describe('useDataImport', () => {
  let originalFileReader: typeof FileReader;
  let fileReaderResult = '';

  beforeEach(() => {
    originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        this.onload?.({
          target: {
            result: fileReaderResult,
          },
        } as ProgressEvent<FileReader>);
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes imported history timestamps before persisting sessions and groups', () => {
    let sessions: SavedChatSession[] = [];
    let groups: ChatGroup[] = [];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const updateAndPersistGroups = vi.fn((updater: (prev: ChatGroup[]) => ChatGroup[]) => {
      groups = updater(groups);
    });

    fileReaderResult = JSON.stringify({
      type: 'AllModelChat-History',
      history: [
        {
          id: 'session-1',
          title: 'Imported',
          timestamp: '2026-04-18T08:30:00.000Z',
          messages: [],
          settings: {},
        },
      ],
      groups: [
        {
          id: 'group-1',
          title: 'Imported Group',
          timestamp: '2026-04-17T08:30:00.000Z',
        },
      ],
    });

    const { result, unmount } = renderHook(() =>
      useDataImport({
        setAppSettings: vi.fn(),
        updateAndPersistSessions,
        updateAndPersistGroups,
        savedScenarios: [],
        handleSaveAllScenarios: vi.fn(),
        t: (key) => key,
      }),
    );

    act(() => {
      result.current.handleImportHistory(
        new File(['history'], 'history.json', { type: 'application/json' }),
      );
    });

    expect(typeof sessions[0].timestamp).toBe('number');
    expect(sessions[0].timestamp).toBe(new Date('2026-04-18T08:30:00.000Z').getTime());
    expect(typeof groups[0].timestamp).toBe('number');
    expect(groups[0].timestamp).toBe(new Date('2026-04-17T08:30:00.000Z').getTime());

    unmount();
  });
});
