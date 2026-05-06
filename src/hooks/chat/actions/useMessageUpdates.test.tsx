import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Part } from '@google/genai';
import type { SavedChatSession } from '../../../types';
import { useMessageUpdates } from './useMessageUpdates';
import { createAppSettings, createChatSettings, createSavedChatSession, createUploadedFile } from '@/test/factories';
import { renderHook } from '@/test/testUtils';

describe('useMessageUpdates', () => {
  it('creates and updates a live model message when generated files arrive before text', () => {
    let sessions: SavedChatSession[] = [
      createSavedChatSession({
        id: 'session-1',
        title: 'Live Session',
        timestamp: Date.now(),
        messages: [],
      }),
    ];

    const updateAndPersistSessions = vi.fn(
      (updater: typeof sessions | ((prev: typeof sessions) => typeof sessions)) => {
        sessions =
          typeof updater === 'function' ? (updater as (prev: typeof sessions) => typeof sessions)(sessions) : updater;
        return sessions;
      },
    );

    const { result, unmount } = renderHook(() =>
      useMessageUpdates({
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings(),
        updateAndPersistSessions,
        userScrolledUpRef: { current: false },
      }),
    );

    const generatedFile = createUploadedFile({
      name: 'chart.png',
    });

    act(() => {
      result.current.handleLiveTranscript('', 'model', false, 'content', undefined, [generatedFile]);
    });

    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        content: '',
        files: [generatedFile],
        isLoading: true,
      }),
    );

    act(() => {
      result.current.handleLiveTranscript('Done.', 'model', true, 'content');
    });

    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        content: 'Done.',
        files: [generatedFile],
        isLoading: false,
      }),
    );

    unmount();
  });

  it('creates a new live session when generated files arrive before any transcript text', () => {
    let sessions: SavedChatSession[] = [];

    const updateAndPersistSessions = vi.fn(
      (updater: typeof sessions | ((prev: typeof sessions) => typeof sessions)) => {
        sessions =
          typeof updater === 'function' ? (updater as (prev: typeof sessions) => typeof sessions)(sessions) : updater;
        return sessions;
      },
    );
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageUpdates({
        activeSessionId: null,
        setActiveSessionId,
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings(),
        updateAndPersistSessions,
        userScrolledUpRef: { current: false },
      }),
    );

    const generatedFile = createUploadedFile({
      name: 'chart.png',
    });

    act(() => {
      result.current.handleLiveTranscript('', 'model', false, 'content', undefined, [generatedFile]);
    });

    expect(setActiveSessionId).toHaveBeenCalledTimes(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Live Session');
    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        files: [generatedFile],
        isLoading: true,
      }),
    );

    unmount();
  });

  it('applies live model api parts through the shared stream reducer', () => {
    let sessions: SavedChatSession[] = [
      createSavedChatSession({
        id: 'session-1',
        title: 'Live Session',
        timestamp: Date.now(),
        messages: [],
      }),
    ];

    const updateAndPersistSessions = vi.fn(
      (updater: typeof sessions | ((prev: typeof sessions) => typeof sessions)) => {
        sessions =
          typeof updater === 'function' ? (updater as (prev: typeof sessions) => typeof sessions)(sessions) : updater;
        return sessions;
      },
    );

    const { result, unmount } = renderHook(() =>
      useMessageUpdates({
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        appSettings: createAppSettings(),
        currentChatSettings: createChatSettings(),
        updateAndPersistSessions,
        userScrolledUpRef: { current: false },
      }),
    );

    const part = { codeExecutionResult: { outcome: 'OUTCOME_OK', output: '42\n' } } as Part;

    act(() => {
      result.current.handleLiveTranscript('', 'model', false, 'content', undefined, undefined, part);
    });

    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        content:
          '\n\n<div class="tool-result outcome-outcome_ok"><strong>Execution Result (OUTCOME_OK):</strong><pre><code class="language-text">42\n</code></pre></div>\n\n',
        apiParts: [part],
        isLoading: true,
      }),
    );

    unmount();
  });
});
