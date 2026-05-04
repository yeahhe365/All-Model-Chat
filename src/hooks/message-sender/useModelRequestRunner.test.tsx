import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/testUtils';
import type { SavedChatSession, UploadedFile } from '../../types';
import { useModelRequestRunner } from './useModelRequestRunner';

const { mockGetKeyForRequest, mockGenerateUniqueId } = vi.hoisted(() => ({
  mockGetKeyForRequest: vi.fn(),
  mockGenerateUniqueId: vi.fn(),
}));

vi.mock('../../utils/apiUtils', () => ({
  getKeyForRequest: mockGetKeyForRequest,
}));

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: mockGenerateUniqueId,
}));

vi.mock('../../constants/appConstants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../constants/appConstants')>();
  return {
    ...actual,
    DEFAULT_CHAT_SETTINGS: { modelId: 'default-model', temperature: 0.3 },
  };
});

describe('useModelRequestRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateUniqueId.mockReturnValue('generated-id');
  });

  it('returns a prepared request with one API key lookup, generation metadata, and key-lock intent', () => {
    mockGetKeyForRequest.mockReturnValue({ key: 'api-key', isNewKey: true });
    const updateAndPersistSessions = vi.fn();
    const activeFile = {
      id: 'file-1',
      name: 'sample.png',
      type: 'image/png',
      size: 10,
      fileUri: 'files/abc',
      uploadState: 'active',
    } as UploadedFile;
    const generationStartTime = new Date('2026-05-04T08:00:00.000Z');

    const { result, unmount } = renderHook(() =>
      useModelRequestRunner({
        appSettings: { modelId: 'gemini-default', apiKey: 'stored-key' } as any,
        currentChatSettings: { modelId: 'gemini-3-pro' } as any,
        updateAndPersistSessions,
        setActiveSessionId: vi.fn(),
        translateApiKeyError: (error) => `translated:${error}`,
      }),
    );

    const prepared = result.current.prepareModelRequest({
      activeModelId: 'gemini-3-pro',
      files: [activeFile],
      generationStartTime,
      messages: {
        noModelSelected: 'No model selected.',
        noModelTitle: 'Model Error',
        apiKeyTitle: 'API Key Error',
      },
    });

    expect(prepared).toEqual(
      expect.objectContaining({
        ok: true,
        keyToUse: 'api-key',
        isNewKey: true,
        shouldLockKey: true,
        generationId: 'generated-id',
        generationStartTime,
      }),
    );
    expect(prepared.ok && prepared.abortController).toBeInstanceOf(AbortController);
    expect(mockGetKeyForRequest).toHaveBeenCalledOnce();
    expect(updateAndPersistSessions).not.toHaveBeenCalled();

    unmount();
  });

  it('creates a translated API-key error session when key preparation fails', () => {
    mockGetKeyForRequest.mockReturnValue({ error: 'API key missing' });
    mockGenerateUniqueId.mockReturnValueOnce('error-message-id').mockReturnValueOnce('error-session-id');
    let sessions: SavedChatSession[] = [];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useModelRequestRunner({
        appSettings: { modelId: 'gemini-default', apiKey: '' } as any,
        currentChatSettings: { modelId: 'gemini-3-pro' } as any,
        updateAndPersistSessions,
        setActiveSessionId,
        translateApiKeyError: (error) => `translated:${error}`,
      }),
    );

    const prepared = result.current.prepareModelRequest({
      activeModelId: 'gemini-3-pro',
      files: [],
      messages: {
        noModelSelected: 'No model selected.',
        noModelTitle: 'Model Error',
        apiKeyTitle: 'API Key Error',
      },
    });

    expect(prepared).toEqual({ ok: false });
    expect(updateAndPersistSessions).toHaveBeenCalledOnce();
    expect(setActiveSessionId).toHaveBeenCalledWith('error-session-id');
    expect(sessions[0]).toEqual(
      expect.objectContaining({
        id: 'error-session-id',
        title: 'API Key Error',
        messages: [
          expect.objectContaining({
            id: 'error-message-id',
            role: 'error',
            content: 'translated:API key missing',
          }),
        ],
      }),
    );

    unmount();
  });
});
