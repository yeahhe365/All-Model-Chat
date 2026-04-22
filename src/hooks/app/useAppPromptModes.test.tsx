import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '../../types';

const { mockLoadCanvasSystemPrompt } = vi.hoisted(() => ({
  mockLoadCanvasSystemPrompt: vi.fn(),
}));

vi.mock('../../constants/promptHelpers', async () => {
  const actual = await vi.importActual<typeof import('../../constants/promptHelpers')>(
    '../../constants/promptHelpers',
  );

  return {
    ...actual,
    loadCanvasSystemPrompt: mockLoadCanvasSystemPrompt,
  };
});

import { useAppPromptModes } from './useAppPromptModes';

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
    rerender: () => {
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const CANVAS_PROMPT = '<title>Canvas 助手：响应式视觉指南</title>\ncanvas prompt';

describe('useAppPromptModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('optimistically marks the canvas prompt active while it is loading', async () => {
    const deferred = createDeferred<string>();
    mockLoadCanvasSystemPrompt.mockReturnValue(deferred.promise);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: {} as AppSettings,
        setAppSettings,
        activeChat: {
          id: 'session-1',
          title: 'Session',
          timestamp: Date.now(),
          messages: [],
          settings: {
            modelId: 'gemini-3-flash-preview',
            systemInstruction: '',
          } as ChatSettings,
        } as SavedChatSession,
        activeSessionId: 'session-1',
        currentChatSettings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: '',
        } as ChatSettings,
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
      }),
    );

    let pendingPromise: Promise<void> | undefined;
    act(() => {
      pendingPromise = result.current.handleLoadCanvasPromptAndSave();
    });

    expect(result.current.isCanvasPromptActive).toBe(true);
    expect(result.current.isCanvasPromptBusy).toBe(true);

    await act(async () => {
      deferred.resolve(CANVAS_PROMPT);
      await pendingPromise;
    });

    expect(setAppSettings).toHaveBeenCalled();
    expect(setCurrentChatSettings).toHaveBeenCalled();
    unmount();
  });

  it('ignores repeated canvas button presses while a canvas prompt load is already in flight', async () => {
    const deferred = createDeferred<string>();
    mockLoadCanvasSystemPrompt.mockReturnValue(deferred.promise);

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: {} as AppSettings,
        setAppSettings: vi.fn(),
        activeChat: {
          id: 'session-1',
          title: 'Session',
          timestamp: Date.now(),
          messages: [],
          settings: {
            modelId: 'gemini-3-flash-preview',
            systemInstruction: '',
          } as ChatSettings,
        } as SavedChatSession,
        activeSessionId: 'session-1',
        currentChatSettings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: '',
        } as ChatSettings,
        setCurrentChatSettings: vi.fn(),
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
      }),
    );

    let firstCall: Promise<void> | undefined;
    act(() => {
      firstCall = result.current.handleLoadCanvasPromptAndSave();
    });

    await act(async () => {
      await result.current.handleLoadCanvasPromptAndSave();
    });

    expect(mockLoadCanvasSystemPrompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(CANVAS_PROMPT);
      await firstCall;
    });

    unmount();
  });
});
