import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../constants/appConstants';
import { SYSTEM_SCENARIO_IDS } from '../features/scenarios/scenarioLibrary';
import { usePreloadedScenarios } from './usePreloadedScenarios';

const { localStorageMock } = vi.hoisted(() => {
  const store = new Map<string, string>();
  const mock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
  });

  return { localStorageMock: mock };
});

vi.mock('../utils/db', () => ({
  dbService: {
    getAllScenarios: vi.fn().mockResolvedValue([]),
    setAllScenarios: vi.fn().mockResolvedValue(undefined),
    setActiveSessionId: vi.fn(),
  },
}));

vi.mock('../utils/appUtils', () => ({
  generateUniqueId: () => 'generated-id',
  generateSessionTitle: () => 'Generated title',
  createNewSession: vi.fn(),
  logService: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
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

describe('usePreloadedScenarios', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns voxel as a user scenario rather than a system preset', async () => {
    const { result, unmount } = renderHook(() =>
      usePreloadedScenarios({
        appSettings: DEFAULT_APP_SETTINGS,
        setAppSettings: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        setActiveSessionId: vi.fn(),
      }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const scenarioIds = result.current.savedScenarios.map((scenario) => scenario.id);

    expect(scenarioIds).toContain('voxel-designer-scenario-default');
    expect(SYSTEM_SCENARIO_IDS).not.toContain('voxel-designer-scenario-default');
    unmount();
  });
});
