import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatGroup, ChatMessage, SavedChatSession, UploadedFile } from '../../../types';

const {
  mockCreateNewSession,
  mockCleanupFilePreviewUrls,
  mockGetSession,
  mockRehydrateSessionFiles,
  mockResolveSupportedModelId,
} = vi.hoisted(() => ({
  mockCreateNewSession: vi.fn(() => ({
    id: 'new-session',
    title: 'New Session',
    timestamp: Date.now(),
    messages: [],
    settings: { modelId: 'gemini-2.5-flash' },
  })),
  mockCleanupFilePreviewUrls: vi.fn(),
  mockGetSession: vi.fn(),
  mockRehydrateSessionFiles: vi.fn((session: SavedChatSession) => session),
  mockResolveSupportedModelId: vi.fn((modelId: string | undefined, fallback: string) => modelId ?? fallback),
}));

vi.mock('../../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/db', () => ({
  dbService: {
    getSession: mockGetSession,
    getAllSessionMetadata: vi.fn(),
    getAllGroups: vi.fn(),
  },
}));

vi.mock('../../../utils/chat/session', () => ({
  createNewSession: mockCreateNewSession,
  rehydrateSessionFiles: mockRehydrateSessionFiles,
}));

vi.mock('../../../utils/fileHelpers', () => ({
  cleanupFilePreviewUrls: mockCleanupFilePreviewUrls,
}));

vi.mock('../../../utils/modelHelpers', () => ({
  resolveSupportedModelId: mockResolveSupportedModelId,
}));

import { useSessionLoader } from './useSessionLoader';

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

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createSession = (id: string, title: string): SavedChatSession => ({
  id,
  title,
  timestamp: Date.now(),
  messages: [
    {
      id: `${id}-message`,
      role: 'user',
      content: `${title} content`,
      timestamp: new Date().toISOString(),
    },
  ],
  settings: {
    modelId: 'gemini-2.5-flash',
    temperature: 1,
    topP: 0.95,
    topK: 64,
    showThoughts: true,
    systemInstruction: '',
    ttsVoice: 'Aoede',
    thinkingBudget: 0,
    thinkingLevel: 'HIGH',
    lockedApiKey: null,
    isGoogleSearchEnabled: false,
    isCodeExecutionEnabled: false,
    isUrlContextEnabled: false,
    isDeepSearchEnabled: false,
    isRawModeEnabled: false,
    hideThinkingInContext: false,
    safetySettings: [],
    mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
  },
});

describe('useSessionLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the newest session selection when earlier loads resolve later', async () => {
    const olderRequest = createDeferred<SavedChatSession | null>();
    const newerRequest = createDeferred<SavedChatSession | null>();

    mockGetSession
      .mockImplementationOnce(() => olderRequest.promise)
      .mockImplementationOnce(() => newerRequest.promise);

    const setSavedSessions = vi.fn();
    const setSavedGroups = vi.fn();
    const setActiveSessionId = vi.fn();
    const setActiveMessages = vi.fn();
    const setSelectedFiles = vi.fn();
    const setEditingMessageId = vi.fn();
    const setCommandedInput = vi.fn();
    const updateAndPersistSessions = vi.fn();

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions,
        setSavedGroups,
        setActiveSessionId,
        setActiveMessages,
        setSelectedFiles,
        setEditingMessageId,
        setCommandedInput,
        updateAndPersistSessions,
        activeChat: undefined,
        userScrolledUpRef: { current: false },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'sidebar-active',
        savedSessions: [] as SavedChatSession[],
      }),
    );

    act(() => {
      void result.current.loadChatSession('older-session');
      void result.current.loadChatSession('newer-session');
    });

    const newerSession = createSession('newer-session', 'Newer Session');
    await act(async () => {
      newerRequest.resolve(newerSession);
      await flushPromises();
    });

    expect(setActiveSessionId).toHaveBeenLastCalledWith('newer-session');
    expect((setActiveMessages.mock.calls.at(-1)?.[0] as ChatMessage[])[0]?.content).toBe(
      'Newer Session content',
    );

    const olderSession = createSession('older-session', 'Older Session');
    await act(async () => {
      olderRequest.resolve(olderSession);
      await flushPromises();
    });

    expect(setActiveSessionId).toHaveBeenLastCalledWith('newer-session');
    expect((setActiveMessages.mock.calls.at(-1)?.[0] as ChatMessage[])[0]?.content).toBe(
      'Newer Session content',
    );

    expect(setSavedGroups).not.toHaveBeenCalled();
    unmount();
  });
});
