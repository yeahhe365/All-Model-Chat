import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { useSettingsLogic } from './useSettingsLogic';

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

describe('useSettingsLogic', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  it('does not include the usage tab in the settings sidebar model', () => {
    const { result, unmount } = renderHook(() =>
      useSettingsLogic({
        isOpen: true,
        currentSettings: DEFAULT_APP_SETTINGS,
        onSave: vi.fn(),
        onClearAllHistory: vi.fn(),
        onClearCache: vi.fn(),
        onImportHistory: vi.fn(),
        t: (key: string) => key,
      }),
    );

    expect(result.current.tabs.map((tab) => tab.id)).not.toContain('usage');
    unmount();
  });

  it('preserves pending setting updates when a model change happens immediately after', () => {
    const onSave = vi.fn();
    const { result, unmount } = renderHook(() =>
      useSettingsLogic({
        isOpen: true,
        currentSettings: DEFAULT_APP_SETTINGS,
        onSave,
        onClearAllHistory: vi.fn(),
        onClearCache: vi.fn(),
        onImportHistory: vi.fn(),
        t: (key: string) => key,
      }),
    );

    act(() => {
      result.current.updateSetting('systemInstruction', 'Persist this prompt');
      result.current.handleModelChange('gemma-4-31b-it');
    });

    expect(onSave).toHaveBeenNthCalledWith(1, {
      ...DEFAULT_APP_SETTINGS,
      systemInstruction: 'Persist this prompt',
    });

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelId: 'gemma-4-31b-it',
        systemInstruction: 'Persist this prompt',
      }),
    );

    unmount();
  });
});
