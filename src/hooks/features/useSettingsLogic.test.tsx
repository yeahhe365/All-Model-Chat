import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { useSettingsLogic } from './useSettingsLogic';

describe('useSettingsLogic', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('includes the usage tab in the settings sidebar model', () => {
    let tabs: Array<{ id: string }> = [];

    const TestComponent = () => {
      tabs = useSettingsLogic({
        isOpen: true,
        currentSettings: DEFAULT_APP_SETTINGS,
        onSave: vi.fn(),
        onClearAllHistory: vi.fn(),
        onClearCache: vi.fn(),
        onImportHistory: vi.fn(),
        t: (key: string) => key,
      }).tabs;
      return null;
    };

    act(() => {
      root.render(<TestComponent />);
    });

    expect(tabs.map((tab) => tab.id)).toContain('usage');
  });
});
