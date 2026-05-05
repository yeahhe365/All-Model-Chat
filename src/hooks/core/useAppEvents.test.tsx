import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelOption } from '../../types';
import { FOCUS_HISTORY_SEARCH_EVENT } from '../../constants/shortcuts';
import { useAppEvents } from './useAppEvents';
import { createAppSettings, createChatSettings } from '@/test/factories';
import { renderHook } from '@/test/testUtils';

const registerPwaMock = vi.fn();
const updateRegistrationMock = vi.fn();
const toggleFullscreenMock = vi.fn();

const createRegistrationMock = (): ServiceWorkerRegistration =>
  ({
    update: updateRegistrationMock,
  }) as unknown as ServiceWorkerRegistration;

vi.mock('../../pwa/register', () => ({
  registerPwa: (...args: unknown[]) => registerPwaMock(...args),
}));

vi.mock('../../pwa/loadRegisterSw', () => ({
  loadRegisterSW: vi.fn(async () => vi.fn()),
}));

vi.mock('../ui/useFullscreen', () => ({
  useFullscreen: () => ({
    toggleFullscreen: toggleFullscreenMock,
  }),
}));

vi.mock('../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('../../pwa/install', () => ({
  getPwaInstallState: vi.fn(() => ({ state: 'installed' })),
  getManualInstallMessage: vi.fn(() => 'manual install'),
}));

describe('useAppEvents manual update checks', () => {
  const appSettings = createAppSettings({
    language: 'en',
    customShortcuts: {},
  });

  const currentChatSettings = createChatSettings({
    modelId: 'gemini-3-flash-preview',
  });
  const availableModels: ModelOption[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PROD', true);
    updateRegistrationMock.mockResolvedValue(undefined);
    registerPwaMock.mockImplementation(
      ({ onRegisteredSW }: { onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void }) => {
        onRegisteredSW?.('/sw.js', createRegistrationMock());
        return vi.fn(async () => undefined);
      },
    );

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        media: '(display-mode: standalone)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports up-to-date when no new service worker is found', async () => {
    const { result, unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
        availableModels,
        handleSelectModelInHeader: vi.fn(),
        setIsLogViewerOpen: vi.fn(),
        onTogglePip: vi.fn(),
        isPipSupported: false,
        pipWindow: null,
        isLoading: false,
        onStopGenerating: vi.fn(),
      }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await result.current.handleCheckForUpdates();
      await new Promise((resolve) => setTimeout(resolve, 1300));
    });

    expect(updateRegistrationMock).toHaveBeenCalledTimes(1);
    expect(result.current.manualUpdateCheckState).toBe('up-to-date');

    unmount();
  });

  it('marks an update as available when the registration signals refresh is needed', async () => {
    let onNeedRefresh: (() => void) | undefined;
    registerPwaMock.mockImplementation(
      (options: {
        onNeedRefresh?: () => void;
        onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
      }) => {
        onNeedRefresh = options.onNeedRefresh;
        options.onRegisteredSW?.('/sw.js', createRegistrationMock());
        return vi.fn(async () => undefined);
      },
    );

    const { result, unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
        availableModels,
        handleSelectModelInHeader: vi.fn(),
        setIsLogViewerOpen: vi.fn(),
        onTogglePip: vi.fn(),
        isPipSupported: false,
        pipWindow: null,
        isLoading: false,
        onStopGenerating: vi.fn(),
      }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const checkPromise = result.current.handleCheckForUpdates();
      onNeedRefresh?.();
      await checkPromise;
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.needRefresh).toBe(true);
    expect(result.current.manualUpdateCheckState).toBe('update-available');

    unmount();
  });

  it('cycles models using the default tab-cycle model subset when no manual selection is stored', async () => {
    const handleSelectModelInHeader = vi.fn();
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-label', 'Chat message input');
    document.body.appendChild(textarea);
    textarea.focus();

    const { unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
        availableModels,
        handleSelectModelInHeader,
        setIsLogViewerOpen: vi.fn(),
        onTogglePip: vi.fn(),
        isPipSupported: false,
        pipWindow: null,
        isLoading: false,
        onStopGenerating: vi.fn(),
      }),
    );

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(handleSelectModelInHeader).toHaveBeenCalledWith('gemini-3-flash-preview');

    textarea.remove();
    unmount();
  });

  it('dispatches the history search focus event with Command/Ctrl K', async () => {
    const focusSearchListener = vi.fn();
    document.addEventListener(FOCUS_HISTORY_SEARCH_EVENT, focusSearchListener);

    const { unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
        availableModels,
        handleSelectModelInHeader: vi.fn(),
        setIsLogViewerOpen: vi.fn(),
        onTogglePip: vi.fn(),
        isPipSupported: false,
        pipWindow: null,
        isLoading: false,
        onStopGenerating: vi.fn(),
      }),
    );

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });

    await act(async () => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(focusSearchListener).toHaveBeenCalledTimes(1);

    document.removeEventListener(FOCUS_HISTORY_SEARCH_EVENT, focusSearchListener);
    unmount();
  });

  it('cycles models using the manually configured tab cycle selection when present', async () => {
    const handleSelectModelInHeader = vi.fn();
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-label', 'Chat message input');
    document.body.appendChild(textarea);
    textarea.focus();

    const { unmount } = renderHook(() =>
      useAppEvents({
        appSettings: createAppSettings({
          ...appSettings,
          tabModelCycleIds: ['imagen-4.0-generate-001', 'gemini-3-flash-preview'],
        }),
        startNewChat: vi.fn(),
        currentChatSettings,
        availableModels,
        handleSelectModelInHeader,
        setIsLogViewerOpen: vi.fn(),
        onTogglePip: vi.fn(),
        isPipSupported: false,
        pipWindow: null,
        isLoading: false,
        onStopGenerating: vi.fn(),
      }),
    );

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(handleSelectModelInHeader).toHaveBeenCalledWith('imagen-4.0-generate-001');

    textarea.remove();
    unmount();
  });
});
