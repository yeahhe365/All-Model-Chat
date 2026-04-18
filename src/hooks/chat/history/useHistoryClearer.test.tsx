import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import type { SavedChatSession } from '../../../types';
import { useHistoryClearer } from './useHistoryClearer';

const { dbServiceMock, cleanupFilePreviewUrlsMock } = vi.hoisted(() => ({
  dbServiceMock: {
    setAllSessions: vi.fn().mockResolvedValue(undefined),
    setAllGroups: vi.fn().mockResolvedValue(undefined),
    setActiveSessionId: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn(),
  },
  cleanupFilePreviewUrlsMock: vi.fn(),
}));

vi.mock('../../../utils/db', () => ({
  dbService: dbServiceMock,
}));

vi.mock('../../../utils/appUtils', () => ({
  logService: {
    warn: vi.fn(),
    info: vi.fn(),
  },
  cleanupFilePreviewUrls: cleanupFilePreviewUrlsMock,
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

const createSession = (id: string): SavedChatSession => ({
  id,
  title: `Session ${id}`,
  timestamp: Date.now(),
  messages: [],
  settings: DEFAULT_CHAT_SETTINGS,
});

describe('useHistoryClearer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears known session-scoped localStorage keys without scanning unrelated entries', () => {
    const values = new Map<string, string>([
      ['chatDraft_session-a', 'draft-a'],
      ['chatQuotes_session-a', '["quote-a"]'],
      ['chatTtsContext_session-a', 'tts-a'],
      ['chat_scroll_pos_session-a', '10'],
      ['chatDraft_session-b', 'draft-b'],
      ['unrelated', 'keep-me'],
    ]);

    const localStorageMock = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        values.delete(key);
      }),
      key: vi.fn(() => {
        throw new Error('clearAllHistory should not scan localStorage keys');
      }),
      clear: vi.fn(() => {
        values.clear();
      }),
    };

    Object.defineProperty(localStorageMock, 'length', {
      configurable: true,
      get() {
        throw new Error('clearAllHistory should not read localStorage length');
      },
    });

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    let savedSessions = [createSession('session-a'), createSession('session-b')];
    let savedGroups = [{ id: 'group-1', title: 'Group 1', timestamp: 1 }];
    const setSavedSessions = vi.fn((updater) => {
      savedSessions = typeof updater === 'function' ? updater(savedSessions) : updater;
    });
    const setSavedGroups = vi.fn((updater) => {
      savedGroups = typeof updater === 'function' ? updater(savedGroups) : updater;
    });
    const startNewChat = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };

    const { result, unmount } = renderHook(() =>
      useHistoryClearer({
        savedSessions,
        setSavedSessions,
        setSavedGroups,
        startNewChat,
        activeJobs,
      }),
    );

    act(() => {
      result.current.clearAllHistory();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chatDraft_session-a');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chatQuotes_session-a');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chatTtsContext_session-a');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chat_scroll_pos_session-a');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chatDraft_session-b');
    expect(localStorageMock.key).not.toHaveBeenCalled();
    expect(values.get('unrelated')).toBe('keep-me');
    expect(savedSessions).toEqual([]);
    expect(savedGroups).toEqual([]);
    expect(startNewChat).toHaveBeenCalledTimes(1);
    expect(dbServiceMock.setAllSessions).toHaveBeenCalledWith([]);
    expect(dbServiceMock.setAllGroups).toHaveBeenCalledWith([]);
    expect(dbServiceMock.setActiveSessionId).toHaveBeenCalledWith(null);

    unmount();
  });
});
