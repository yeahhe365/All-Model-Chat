import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '../../types';

const { mockLoadCanvasSystemPrompt } = vi.hoisted(() => ({
  mockLoadCanvasSystemPrompt: vi.fn(),
}));

vi.mock('../../constants/promptHelpers', async () => {
  const actual = await vi.importActual<typeof import('../../constants/promptHelpers')>('../../constants/promptHelpers');

  return {
    ...actual,
    loadCanvasSystemPrompt: mockLoadCanvasSystemPrompt,
  };
});

import { focusChatInput, useAppPromptModes } from './useAppPromptModes';

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
const CANVAS_PROMPT_EN = '<title>Canvas Assistant: Responsive Visual Guide</title>\ncanvas prompt';

describe('useAppPromptModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('ignores delayed focus after the document has been torn down', () => {
    const originalDocument = document;
    vi.useFakeTimers();

    focusChatInput(0);
    vi.stubGlobal('document', undefined);

    expect(() => vi.runOnlyPendingTimers()).not.toThrow();
    vi.stubGlobal('document', originalDocument);
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

  it('loads the canvas prompt in the active UI language', async () => {
    mockLoadCanvasSystemPrompt.mockResolvedValue(CANVAS_PROMPT_EN);

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
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.handleLoadCanvasPromptAndSave();
    });

    expect(mockLoadCanvasSystemPrompt).toHaveBeenCalledWith('en');
    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    expect(appSettingsUpdater({} as AppSettings).systemInstruction).toBe(CANVAS_PROMPT_EN);

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

  it('allows toggling the canvas prompt in a different session after switching away from an in-flight load', async () => {
    const deferred = createDeferred<string>();
    mockLoadCanvasSystemPrompt.mockReturnValueOnce(deferred.promise).mockResolvedValue(CANVAS_PROMPT);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const options = {
      appSettings: {} as AppSettings,
      setAppSettings,
      activeChat: {
        id: 'session-1',
        title: 'Session 1',
        timestamp: Date.now(),
        messages: [],
        settings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: '',
        } as ChatSettings,
      } as SavedChatSession,
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      } as ChatSettings,
      setCurrentChatSettings,
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    act(() => {
      void result.current.handleLoadCanvasPromptAndSave();
    });

    options.activeChat = {
      id: 'session-2',
      title: 'Session 2',
      timestamp: Date.now(),
      messages: [],
      settings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      } as ChatSettings,
    } as SavedChatSession;
    options.activeSessionId = 'session-2';
    options.currentChatSettings = {
      modelId: 'gemini-3-flash-preview',
      systemInstruction: '',
    } as ChatSettings;
    rerender();

    await act(async () => {
      await result.current.handleLoadCanvasPromptAndSave();
    });

    expect(mockLoadCanvasSystemPrompt).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve(CANVAS_PROMPT);
      await Promise.resolve();
    });

    unmount();
  });

  it('does not write the canvas prompt into the newly active session when an older load resolves late', async () => {
    const deferred = createDeferred<string>();
    mockLoadCanvasSystemPrompt.mockReturnValue(deferred.promise);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const options = {
      appSettings: {} as AppSettings,
      setAppSettings,
      activeChat: {
        id: 'session-1',
        title: 'Session 1',
        timestamp: Date.now(),
        messages: [],
        settings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: '',
        } as ChatSettings,
      } as SavedChatSession,
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      } as ChatSettings,
      setCurrentChatSettings,
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    act(() => {
      void result.current.handleLoadCanvasPromptAndSave();
    });

    options.activeChat = {
      id: 'session-2',
      title: 'Session 2',
      timestamp: Date.now(),
      messages: [],
      settings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      } as ChatSettings,
    } as SavedChatSession;
    options.activeSessionId = 'session-2';
    options.currentChatSettings = {
      modelId: 'gemini-3-flash-preview',
      systemInstruction: '',
    } as ChatSettings;
    rerender();

    await act(async () => {
      deferred.resolve(CANVAS_PROMPT);
      await Promise.resolve();
    });

    expect(setCurrentChatSettings).not.toHaveBeenCalled();

    unmount();
  });

  it('keeps the canvas button active while app settings already contain the canvas prompt', () => {
    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: {
          systemInstruction: CANVAS_PROMPT,
        } as AppSettings,
        setAppSettings: vi.fn(),
        activeChat: {
          id: 'session-1',
          title: 'Session 1',
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

    expect(result.current.isCanvasPromptActive).toBe(true);

    unmount();
  });

  it('stays inactive after disabling the canvas prompt once persisted settings are cleared', async () => {
    const options = {
      appSettings: {
        systemInstruction: CANVAS_PROMPT,
      } as AppSettings,
      setAppSettings: vi.fn(),
      activeChat: {
        id: 'session-1',
        title: 'Session 1',
        timestamp: Date.now(),
        messages: [],
        settings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: CANVAS_PROMPT,
        } as ChatSettings,
      } as SavedChatSession,
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: CANVAS_PROMPT,
      } as ChatSettings,
      setCurrentChatSettings: vi.fn(),
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    await act(async () => {
      await result.current.handleLoadCanvasPromptAndSave();
    });

    expect(result.current.isCanvasPromptActive).toBe(false);

    options.appSettings = {
      systemInstruction: '',
    } as AppSettings;
    options.activeChat = {
      ...options.activeChat,
      settings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      } as ChatSettings,
    } as SavedChatSession;
    options.currentChatSettings = {
      modelId: 'gemini-3-flash-preview',
      systemInstruction: '',
    } as ChatSettings;

    rerender();
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isCanvasPromptActive).toBe(false);

    unmount();
  });

  it('turns off canvas prompt and clears only the text input when smart board is clicked while active', async () => {
    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const setCommandedInput = vi.fn() as unknown as (command: InputCommand) => void;

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: {
          systemInstruction: CANVAS_PROMPT,
        } as AppSettings,
        setAppSettings,
        activeChat: {
          id: 'session-1',
          title: 'Session 1',
          timestamp: Date.now(),
          messages: [],
          settings: {
            modelId: 'gemini-3-flash-preview',
            systemInstruction: CANVAS_PROMPT,
          } as ChatSettings,
        } as SavedChatSession,
        activeSessionId: 'session-1',
        currentChatSettings: {
          modelId: 'gemini-3-flash-preview',
          systemInstruction: CANVAS_PROMPT,
        } as ChatSettings,
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput,
      }),
    );

    await act(async () => {
      await result.current.handleSuggestionClick('organize', 'Create interactive HTML board.');
    });

    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    expect(setCurrentChatSettings).toHaveBeenCalledWith(expect.any(Function));

    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    const chatSettingsUpdater = setCurrentChatSettings.mock.calls.at(-1)?.[0] as (prev: ChatSettings) => ChatSettings;
    expect(appSettingsUpdater({ systemInstruction: CANVAS_PROMPT } as AppSettings).systemInstruction).toBe('');
    expect(chatSettingsUpdater({ systemInstruction: CANVAS_PROMPT } as ChatSettings).systemInstruction).toBe('');
    expect(setCommandedInput).toHaveBeenCalledWith({
      text: '',
      id: expect.any(Number),
      mode: 'replace',
    });
    expect(mockLoadCanvasSystemPrompt).not.toHaveBeenCalled();

    unmount();
  });
});
