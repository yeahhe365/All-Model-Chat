import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '@/types';
import { createAppSettings, createChatSettings, createSavedChatSession } from '@/test/factories';

const { mockLoadLiveArtifactsSystemPrompt } = vi.hoisted(() => ({
  mockLoadLiveArtifactsSystemPrompt: vi.fn(),
}));

vi.mock('@/constants/promptHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/constants/promptHelpers')>('@/constants/promptHelpers');

  return {
    ...actual,
    loadLiveArtifactsSystemPrompt: mockLoadLiveArtifactsSystemPrompt,
  };
});

import { focusChatInput, useAppPromptModes } from './useAppPromptModes';
import { createDeferred, renderHook } from '@/test/testUtils';

const LIVE_ARTIFACTS_PROMPT = '[Live Artifacts Protocol - zh]\nLive Artifacts prompt';
const LIVE_ARTIFACTS_PROMPT_EN = '[Live Artifacts Protocol - en]\nLive Artifacts prompt';

const createLiveArtifactsChatSettings = (overrides: Partial<ChatSettings> = {}) =>
  createChatSettings({
    modelId: 'gemini-3-flash-preview',
    systemInstruction: '',
    ...overrides,
  });

const createLiveArtifactsSession = (
  overrides: Partial<SavedChatSession> = {},
  settingsOverrides: Partial<ChatSettings> = {},
): SavedChatSession =>
  createSavedChatSession({
    id: 'session-1',
    title: 'Session',
    timestamp: Date.now(),
    messages: [],
    settings: createLiveArtifactsChatSettings(settingsOverrides),
    ...overrides,
  });

describe('useAppPromptModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ignores delayed focus after the document has been torn down', () => {
    const originalDocument = document;
    vi.useFakeTimers();

    focusChatInput(0);
    vi.stubGlobal('document', undefined);

    expect(() => vi.runOnlyPendingTimers()).not.toThrow();
    vi.stubGlobal('document', originalDocument);
  });

  it('optimistically marks the Live Artifacts prompt active while it is loading', async () => {
    const deferred = createDeferred<string>();
    mockLoadLiveArtifactsSystemPrompt.mockReturnValue(deferred.promise);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings(),
        setAppSettings,
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
      }),
    );

    let pendingPromise: Promise<void> | undefined;
    act(() => {
      pendingPromise = result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(result.current.isLiveArtifactsPromptActive).toBe(true);
    expect(result.current.isLiveArtifactsPromptBusy).toBe(true);

    await act(async () => {
      deferred.resolve(LIVE_ARTIFACTS_PROMPT);
      await pendingPromise;
    });

    expect(setAppSettings).toHaveBeenCalled();
    expect(setCurrentChatSettings).toHaveBeenCalled();
    unmount();
  });

  it('loads the Live Artifacts prompt in the active UI language', async () => {
    mockLoadLiveArtifactsSystemPrompt.mockResolvedValue(LIVE_ARTIFACTS_PROMPT_EN);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings(),
        setAppSettings,
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).toHaveBeenCalledWith('en', 'inline');
    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    expect(appSettingsUpdater(createAppSettings()).systemInstruction).toBe(LIVE_ARTIFACTS_PROMPT_EN);

    unmount();
  });

  it('loads the selected built-in Live Artifacts prompt version', async () => {
    mockLoadLiveArtifactsSystemPrompt.mockResolvedValue(LIVE_ARTIFACTS_PROMPT_EN);

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings({ liveArtifactsPromptMode: 'full' }),
        setAppSettings: vi.fn(),
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings: vi.fn(),
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).toHaveBeenCalledWith('en', 'full');

    unmount();
  });

  it('uses the configured custom Live Artifacts prompt for prompt-mode activation', async () => {
    const customPrompt = 'Custom Live Artifacts prompt without built-in marker';
    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings({ liveArtifactsSystemPrompt: customPrompt } as unknown as Partial<AppSettings>),
        setAppSettings,
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).not.toHaveBeenCalled();
    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    expect(appSettingsUpdater(createAppSettings()).systemInstruction).toBe(customPrompt);

    unmount();
  });

  it('uses the custom Live Artifacts prompt for the selected prompt version', async () => {
    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings({
          liveArtifactsPromptMode: 'fullHtml',
          liveArtifactsSystemPrompts: {
            inline: 'Inline custom prompt',
            full: 'Full custom prompt',
            fullHtml: 'Complete HTML custom prompt',
          },
        } as unknown as Partial<AppSettings>),
        setAppSettings,
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings,
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).not.toHaveBeenCalled();
    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    expect(appSettingsUpdater(createAppSettings()).systemInstruction).toBe('Complete HTML custom prompt');

    unmount();
  });

  it('ignores repeated Live Artifacts button presses while a Live Artifacts prompt load is already in flight', async () => {
    const deferred = createDeferred<string>();
    mockLoadLiveArtifactsSystemPrompt.mockReturnValue(deferred.promise);

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings(),
        setAppSettings: vi.fn(),
        activeChat: createLiveArtifactsSession(),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings: vi.fn(),
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
      }),
    );

    let firstCall: Promise<void> | undefined;
    act(() => {
      firstCall = result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(LIVE_ARTIFACTS_PROMPT);
      await firstCall;
    });

    unmount();
  });

  it('allows toggling the Live Artifacts prompt in a different session after switching away from an in-flight load', async () => {
    const deferred = createDeferred<string>();
    mockLoadLiveArtifactsSystemPrompt.mockReturnValueOnce(deferred.promise).mockResolvedValue(LIVE_ARTIFACTS_PROMPT);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const options = {
      appSettings: createAppSettings(),
      setAppSettings,
      activeChat: createLiveArtifactsSession({ title: 'Session 1' }),
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: createLiveArtifactsChatSettings(),
      setCurrentChatSettings,
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    act(() => {
      void result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    options.activeChat = createLiveArtifactsSession({
      id: 'session-2',
      title: 'Session 2',
    });
    options.activeSessionId = 'session-2';
    options.currentChatSettings = createLiveArtifactsChatSettings();
    rerender();

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(mockLoadLiveArtifactsSystemPrompt).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve(LIVE_ARTIFACTS_PROMPT);
      await Promise.resolve();
    });

    unmount();
  });

  it('does not write the Live Artifacts prompt into the newly active session when an older load resolves late', async () => {
    const deferred = createDeferred<string>();
    mockLoadLiveArtifactsSystemPrompt.mockReturnValue(deferred.promise);

    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const options = {
      appSettings: createAppSettings(),
      setAppSettings,
      activeChat: createLiveArtifactsSession({ title: 'Session 1' }),
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: createLiveArtifactsChatSettings(),
      setCurrentChatSettings,
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    act(() => {
      void result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    options.activeChat = createLiveArtifactsSession({
      id: 'session-2',
      title: 'Session 2',
    });
    options.activeSessionId = 'session-2';
    options.currentChatSettings = createLiveArtifactsChatSettings();
    rerender();

    await act(async () => {
      deferred.resolve(LIVE_ARTIFACTS_PROMPT);
      await Promise.resolve();
    });

    expect(setCurrentChatSettings).not.toHaveBeenCalled();

    unmount();
  });

  it('keeps the Live Artifacts button active while app settings already contain the Live Artifacts prompt', () => {
    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }),
        setAppSettings: vi.fn(),
        activeChat: createLiveArtifactsSession({ title: 'Session 1' }),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings: vi.fn(),
        handleSendMessage: vi.fn(),
        setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
      }),
    );

    expect(result.current.isLiveArtifactsPromptActive).toBe(true);

    unmount();
  });

  it('stays inactive after disabling the Live Artifacts prompt once persisted settings are cleared', async () => {
    const options = {
      appSettings: createAppSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }),
      setAppSettings: vi.fn(),
      activeChat: createLiveArtifactsSession({ title: 'Session 1' }, { systemInstruction: LIVE_ARTIFACTS_PROMPT }),
      activeSessionId: 'session-1' as string | null,
      currentChatSettings: createLiveArtifactsChatSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }),
      setCurrentChatSettings: vi.fn(),
      handleSendMessage: vi.fn(),
      setCommandedInput: vi.fn() as unknown as (command: InputCommand) => void,
    };

    const { result, rerender, unmount } = renderHook(() => useAppPromptModes(options));

    await act(async () => {
      await result.current.handleLoadLiveArtifactsPromptAndSave();
    });

    expect(result.current.isLiveArtifactsPromptActive).toBe(false);

    options.appSettings = createAppSettings({ systemInstruction: '' });
    options.activeChat = {
      ...options.activeChat,
      settings: createLiveArtifactsChatSettings(),
    };
    options.currentChatSettings = createLiveArtifactsChatSettings();

    rerender();
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLiveArtifactsPromptActive).toBe(false);

    unmount();
  });

  it('fills the Live Artifacts suggestion into the input and activates the prompt without sending', async () => {
    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const setCommandedInput = vi.fn() as unknown as (command: InputCommand) => void;
    const handleSendMessage = vi.fn();

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings(),
        setAppSettings,
        activeChat: createLiveArtifactsSession({ title: 'Session 1' }),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings(),
        setCurrentChatSettings,
        handleSendMessage,
        setCommandedInput,
      }),
    );

    await act(async () => {
      await result.current.handleSuggestionClick('organize', 'Create interactive HTML board.');
    });

    expect(handleSendMessage).not.toHaveBeenCalled();
    expect(setCommandedInput).toHaveBeenCalledWith({
      text: 'Create interactive HTML board.\n',
      id: expect.any(Number),
    });
    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    expect(result.current.isLiveArtifactsPromptActive).toBe(true);

    unmount();
  });

  it('turns off Live Artifacts and clears the input when the suggestion is clicked while already active', async () => {
    const setAppSettings = vi.fn();
    const setCurrentChatSettings = vi.fn();
    const setCommandedInput = vi.fn() as unknown as (command: InputCommand) => void;
    const handleSendMessage = vi.fn();

    const { result, unmount } = renderHook(() =>
      useAppPromptModes({
        appSettings: createAppSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }),
        setAppSettings,
        activeChat: createLiveArtifactsSession({ title: 'Session 1' }, { systemInstruction: LIVE_ARTIFACTS_PROMPT }),
        activeSessionId: 'session-1',
        currentChatSettings: createLiveArtifactsChatSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }),
        setCurrentChatSettings,
        handleSendMessage,
        setCommandedInput,
      }),
    );

    await act(async () => {
      await result.current.handleSuggestionClick('organize', 'Create interactive HTML board.');
    });

    expect(handleSendMessage).not.toHaveBeenCalled();
    expect(setAppSettings).toHaveBeenCalledWith(expect.any(Function));
    expect(setCurrentChatSettings).toHaveBeenCalledWith(expect.any(Function));

    const appSettingsUpdater = setAppSettings.mock.calls.at(-1)?.[0] as (prev: AppSettings) => AppSettings;
    const chatSettingsUpdater = setCurrentChatSettings.mock.calls.at(-1)?.[0] as (prev: ChatSettings) => ChatSettings;
    expect(appSettingsUpdater(createAppSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT })).systemInstruction).toBe(
      '',
    );
    expect(
      chatSettingsUpdater(createLiveArtifactsChatSettings({ systemInstruction: LIVE_ARTIFACTS_PROMPT }))
        .systemInstruction,
    ).toBe('');
    expect(setCommandedInput).toHaveBeenCalledWith({
      text: '',
      id: expect.any(Number),
      mode: 'replace',
    });
    expect(mockLoadLiveArtifactsSystemPrompt).not.toHaveBeenCalled();

    unmount();
  });
});
