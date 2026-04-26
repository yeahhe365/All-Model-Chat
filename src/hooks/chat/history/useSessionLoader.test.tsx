import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage, SavedChatSession, UploadedFile } from '../../../types';
import { MediaResolution } from '../../../types';

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
import { dbService } from '../../../utils/db';

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
      timestamp: new Date(),
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
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
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

    expect(setActiveSessionId).toHaveBeenLastCalledWith('newer-session', { history: 'push' });
    expect((setActiveMessages.mock.calls.at(-1)?.[0] as ChatMessage[])[0]?.content).toBe('Newer Session content');

    const olderSession = createSession('older-session', 'Older Session');
    await act(async () => {
      olderRequest.resolve(olderSession);
      await flushPromises();
    });

    expect(setActiveSessionId).toHaveBeenLastCalledWith('newer-session', { history: 'push' });
    expect((setActiveMessages.mock.calls.at(-1)?.[0] as ChatMessage[])[0]?.content).toBe('Newer Session content');

    expect(setSavedGroups).not.toHaveBeenCalled();
    unmount();
  });

  it('pushes browser history when loading a different session from the UI', async () => {
    mockGetSession.mockResolvedValueOnce(createSession('session-next', 'Next Session'));

    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions: vi.fn(),
        setSavedGroups: vi.fn(),
        setActiveSessionId,
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat: undefined,
        userScrolledUpRef: { current: false },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-current',
        savedSessions: [] as SavedChatSession[],
      }),
    );

    await act(async () => {
      await result.current.loadChatSession('session-next');
      await flushPromises();
    });

    expect(setActiveSessionId).toHaveBeenLastCalledWith('session-next', { history: 'push' });

    unmount();
  });

  it('can restore a session in history replay mode without pushing another history entry', async () => {
    mockGetSession.mockResolvedValueOnce(createSession('session-back', 'Back Session'));

    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions: vi.fn(),
        setSavedGroups: vi.fn(),
        setActiveSessionId,
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat: undefined,
        userScrolledUpRef: { current: false },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-current',
        savedSessions: [] as SavedChatSession[],
      }),
    );

    await act(async () => {
      await result.current.loadChatSession('session-back', { history: 'none' });
      await flushPromises();
    });

    expect(setActiveSessionId).toHaveBeenLastCalledWith('session-back', { history: 'none' });

    unmount();
  });

  it('retains outgoing active session messages in memory before switching sessions', async () => {
    const nextRequest = createDeferred<SavedChatSession | null>();
    mockGetSession.mockImplementationOnce(() => nextRequest.promise);

    const setSavedSessions = vi.fn();
    const activeChat = createSession('session-active', 'Active Session');

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions,
        setSavedGroups: vi.fn(),
        setActiveSessionId: vi.fn(),
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat,
        userScrolledUpRef: { current: false },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-active',
        savedSessions: [{ ...activeChat, messages: [] }] as SavedChatSession[],
      }),
    );

    act(() => {
      void result.current.loadChatSession('session-next');
    });

    const retainUpdater = setSavedSessions.mock.calls[0]?.[0];
    expect(typeof retainUpdater).toBe('function');

    const retainedSessions = retainUpdater([{ ...activeChat, messages: [] }]);
    expect(retainedSessions[0].messages).toEqual(activeChat.messages);

    await act(async () => {
      nextRequest.resolve(createSession('session-next', 'Next Session'));
      await flushPromises();
    });

    unmount();
  });

  it('does not overwrite newer in-memory session settings when initial metadata resolves late', async () => {
    const metadataDeferred = createDeferred<SavedChatSession[]>();
    const groupsDeferred = createDeferred<any[]>();

    vi.mocked(dbService.getAllSessionMetadata).mockReturnValueOnce(metadataDeferred.promise as Promise<any>);
    vi.mocked(dbService.getAllGroups).mockReturnValueOnce(groupsDeferred.promise as Promise<any>);
    mockGetSession.mockResolvedValue(null);

    const setSavedSessions = vi.fn();
    const setSavedGroups = vi.fn();

    const staleSession = createSession('session-1', 'Stale Session');
    staleSession.messages = [];
    staleSession.settings.systemInstruction = '<title>Canvas 助手：响应式视觉指南</title>\nstale';

    const freshSession = createSession('session-1', 'Fresh Session');
    freshSession.messages = [];
    freshSession.settings.systemInstruction = '';

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions,
        setSavedGroups,
        setActiveSessionId: vi.fn(),
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat: undefined,
        userScrolledUpRef: { current: false },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-1',
        savedSessions: [freshSession] as SavedChatSession[],
      }),
    );

    await act(async () => {
      void result.current.loadInitialData();
      metadataDeferred.resolve([staleSession]);
      groupsDeferred.resolve([]);
      await flushPromises();
    });

    const updater = setSavedSessions.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');

    const mergedSessions = updater([freshSession]);
    expect(mergedSessions).toHaveLength(1);
    expect(mergedSessions[0].settings.systemInstruction).toBe('');

    unmount();
  });

  it('clears stale file errors when starting a fresh chat', () => {
    const setAppFileError = vi.fn();

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'gemini-2.5-flash' } as any,
        setSavedSessions: vi.fn(),
        setSavedGroups: vi.fn(),
        setActiveSessionId: vi.fn(),
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat: undefined,
        userScrolledUpRef: { current: true },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-current',
        savedSessions: [] as SavedChatSession[],
        setAppFileError,
      } as any),
    );

    act(() => {
      result.current.startNewChat();
    });

    expect(setAppFileError).toHaveBeenCalledWith(null);
    unmount();
  });

  it('refreshes reused empty chat settings from app defaults instead of keeping stale session settings', () => {
    const updateAndPersistSessions = vi.fn();
    const emptyActiveSession = {
      ...createSession('session-empty', 'Empty Session'),
      messages: [],
      timestamp: 2,
      settings: {
        ...createSession('session-empty', 'Empty Session').settings,
        modelId: 'stale-model',
        lockedApiKey: 'old-key',
        isGoogleSearchEnabled: true,
      },
    };

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: {
          modelId: 'global-model',
          isGoogleSearchEnabled: false,
          lockedApiKey: null,
        } as any,
        setSavedSessions: vi.fn(),
        setSavedGroups: vi.fn(),
        setActiveSessionId: vi.fn(),
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions,
        activeChat: emptyActiveSession,
        userScrolledUpRef: { current: true },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-empty',
        savedSessions: [emptyActiveSession] as SavedChatSession[],
        setAppFileError: vi.fn(),
      } as any),
    );

    act(() => {
      result.current.startNewChat();
    });

    expect(updateAndPersistSessions).toHaveBeenCalledTimes(1);
    const updater = updateAndPersistSessions.mock.calls[0][0];
    const updatedSessions = updater([emptyActiveSession]);
    expect(updatedSessions[0].settings.modelId).toBe('global-model');
    expect(updatedSessions[0].settings.lockedApiKey).toBeNull();
    expect(updatedSessions[0].settings.isGoogleSearchEnabled).toBe(false);

    unmount();
  });

  it('inherits new chat settings from the most recent session by timestamp instead of a pinned session', () => {
    const pinnedSession = createSession('session-pinned', 'Pinned Session');
    pinnedSession.timestamp = 1;
    pinnedSession.isPinned = true;
    pinnedSession.settings.modelId = 'pinned-model';

    const recentSession = createSession('session-recent', 'Recent Session');
    recentSession.timestamp = 3;
    recentSession.isPinned = false;
    recentSession.settings.modelId = 'recent-model';

    const { result, unmount } = renderHook(() =>
      useSessionLoader({
        appSettings: { modelId: 'global-model' } as any,
        setSavedSessions: vi.fn(),
        setSavedGroups: vi.fn(),
        setActiveSessionId: vi.fn(),
        setActiveMessages: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setCommandedInput: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        activeChat: createSession('session-current', 'Current Session'),
        userScrolledUpRef: { current: true },
        selectedFiles: [] as UploadedFile[],
        fileDraftsRef: { current: {} as Record<string, UploadedFile[]> },
        activeSessionId: 'session-current',
        savedSessions: [pinnedSession, recentSession] as SavedChatSession[],
        setAppFileError: vi.fn(),
      } as any),
    );

    act(() => {
      result.current.startNewChat();
    });

    expect(mockCreateNewSession).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'recent-model' }));

    unmount();
  });
});
