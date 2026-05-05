import { describe, expect, it, vi } from 'vitest';
import type { SavedChatSession } from '../../types';
import { createAppSettings, createChatSettings, createUploadedFile } from '@/test/factories';

const { playCompletionSoundMock } = vi.hoisted(() => ({
  playCompletionSoundMock: vi.fn(),
}));

vi.mock('../../utils/uiUtils', () => ({
  playCompletionSound: playCompletionSoundMock,
  showNotification: vi.fn(),
}));

import { completeModelMessage, runOptimisticMessagePipeline, startOptimisticMessageTurn } from './messagePipeline';

describe('messagePipeline', () => {
  it('creates a new optimistic user/model turn through one shared entry point', () => {
    let sessions: SavedChatSession[] = [];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const setActiveSessionId = vi.fn();
    const generationStartTime = new Date('2026-05-02T01:15:00.000Z');
    const file = createUploadedFile({
      name: 'source.png',
    });

    const result = startOptimisticMessageTurn({
      activeSessionId: null,
      appSettings: createAppSettings({
        modelId: 'app-default-model',
        temperature: 0.9,
        topP: 0.8,
      }),
      currentChatSettings: createChatSettings({
        modelId: 'turn-model',
        temperature: 0.2,
      }),
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

  it('updates the completed model message through a shared session updater helper', () => {
    const generationEndTime = new Date('2026-05-04T10:00:00.000Z');
    const sessions = completeModelMessage(
      [
        {
          id: 'session-1',
          title: 'Chat',
          timestamp: 1,
          groupId: null,
          settings: createChatSettings(),
          messages: [
            {
              id: 'model-message',
              role: 'model',
              content: '',
              timestamp: new Date('2026-05-04T09:59:00.000Z'),
              isLoading: true,
            },
          ],
        },
      ],
      {
        sessionId: 'session-1',
        messageId: 'model-message',
        patch: {
          isLoading: false,
          content: 'done',
          generationEndTime,
        },
      },
    );

    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        id: 'model-message',
        isLoading: false,
        content: 'done',
        generationEndTime,
      }),
    );
  });

  it('runs optimistic senders through one shared lifecycle and completion path', async () => {
    let sessions: SavedChatSession[] = [];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());
    const generationStartTime = new Date('2026-05-04T10:00:00.000Z');

    const turn = await runOptimisticMessagePipeline({
      activeSessionId: null,
      appSettings: createAppSettings({
        isCompletionSoundEnabled: true,
        isCompletionNotificationEnabled: false,
      }),
      currentChatSettings: createChatSettings({
        modelId: 'imagen-4.0-generate-001',
      }),
      updateAndPersistSessions,
      setActiveSessionId,
      text: 'draw a foxglove',
      generationId: 'generation-1',
      generationStartTime,
      keyToLock: 'api-key',
      shouldLockKey: true,
      abortController: new AbortController(),
      errorPrefix: 'Image Gen Error',
      runMessageLifecycle,
      execute: async () => ({
        patch: {
          isLoading: false,
          content: 'Generated image',
          generationEndTime: new Date('2026-05-04T10:00:01.000Z'),
        },
        feedback: { sound: true },
      }),
      createSessionId: () => 'new-session',
    });

    expect(turn?.finalSessionId).toBe('new-session');
    expect(runMessageLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'new-session',
        generationId: 'generation-1',
        modelMessageId: 'generation-1',
        errorPrefix: 'Image Gen Error',
      }),
    );
    expect(sessions[0].messages[1]).toEqual(
      expect.objectContaining({
        id: 'generation-1',
        isLoading: false,
        content: 'Generated image',
      }),
    );
    expect(playCompletionSoundMock).toHaveBeenCalledOnce();
  });
});
