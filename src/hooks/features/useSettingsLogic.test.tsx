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
    localStorage.clear();
  });

  it('includes the usage tab in the settings sidebar model', () => {
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

    expect(result.current.tabs.map((tab) => tab.id)).toContain('usage');
    unmount();
  });
});
