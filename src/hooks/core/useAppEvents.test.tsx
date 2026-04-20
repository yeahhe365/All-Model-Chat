import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, ChatSettings } from '../../types';
import { useAppEvents } from './useAppEvents';

const registerPwaMock = vi.fn();
const updateRegistrationMock = vi.fn();
const toggleFullscreenMock = vi.fn();

const createRegistrationMock = (): ServiceWorkerRegistration =>
  ({
    update: updateRegistrationMock,
  } as unknown as ServiceWorkerRegistration);

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

vi.mock('../../utils/appUtils', async () => {
  const actual = await vi.importActual<typeof import('../../utils/appUtils')>('../../utils/appUtils');
  return {
    ...actual,
    logService: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('../../pwa/install', () => ({
  getPwaInstallState: vi.fn(() => ({ state: 'installed' })),
  getManualInstallMessage: vi.fn(() => 'manual install'),
}));

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
      container.remove();
    },
  };
};

describe('useAppEvents manual update checks', () => {
  const appSettings = {
    language: 'en',
    customShortcuts: {},
  } as AppSettings;

  const currentChatSettings = {
    modelId: 'gemini-3-flash-preview',
  } as ChatSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PROD', true);
    updateRegistrationMock.mockResolvedValue(undefined);
    registerPwaMock.mockImplementation(({ onRegisteredSW }: { onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void }) => {
      onRegisteredSW?.('/sw.js', createRegistrationMock());
      return vi.fn(async () => undefined);
    });

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
    document.body.innerHTML = '';
  });

  it('reports up-to-date when no new service worker is found', async () => {
    const { result, unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
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
    registerPwaMock.mockImplementation((options: { onNeedRefresh?: () => void; onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void }) => {
      onNeedRefresh = options.onNeedRefresh;
      options.onRegisteredSW?.('/sw.js', createRegistrationMock());
      return vi.fn(async () => undefined);
    });

    const { result, unmount } = renderHook(() =>
      useAppEvents({
        appSettings,
        startNewChat: vi.fn(),
        currentChatSettings,
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
});
