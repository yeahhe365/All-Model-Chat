import { describe, expect, it, vi } from 'vitest';
import type { SavedChatSession, UploadedFile } from '../../types';
import { startOptimisticMessageTurn } from './messagePipeline';

describe('messagePipeline', () => {
  it('creates a new optimistic user/model turn through one shared entry point', () => {
    let sessions: SavedChatSession[] = [];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const setActiveSessionId = vi.fn();
    const generationStartTime = new Date('2026-05-02T01:15:00.000Z');
    const file = {
      id: 'file-1',
      name: 'source.png',
      type: 'image/png',
      size: 123,
    } as UploadedFile;

    const result = startOptimisticMessageTurn({
      activeSessionId: null,
      appSettings: {
        modelId: 'app-default-model',
        temperature: 0.9,
        topP: 0.8,
      } as any,
      currentChatSettings: {
        modelId: 'turn-model',
        temperature: 0.2,
      } as any,
      updateAndPersistSessions,
      setActiveSessionId,
      text: 'edit this image',
      files: [file],
      generationId: 'generation-1',
      generationStartTime,
      keyToLock: 'api-key',
      shouldLockKey: true,
      shouldGenerateTitle: true,
      createSessionId: () => 'new-session',
    });

    expect(result.finalSessionId).toBe('new-session');
    expect(result.modelMessageId).toBe('generation-1');
    expect(setActiveSessionId).toHaveBeenCalledWith('new-session');
    expect(updateAndPersistSessions).toHaveBeenCalledOnce();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual(
      expect.objectContaining({
        id: 'new-session',
        settings: expect.objectContaining({
          modelId: 'turn-model',
          temperature: 0.2,
          lockedApiKey: 'api-key',
        }),
      }),
    );
    expect(sessions[0].messages).toHaveLength(2);
    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'user',
        content: 'edit this image',
        files: [file],
      }),
    );
    expect(sessions[0].messages[1]).toEqual(
      expect.objectContaining({
        id: 'generation-1',
        role: 'model',
        content: '',
        isLoading: true,
        generationStartTime,
      }),
    );
  });
});
