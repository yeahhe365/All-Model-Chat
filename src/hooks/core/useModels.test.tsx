import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModels } from './useModels';

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
    },
  };
};

describe('useModels', () => {
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

  it('filters removed Gemini 2.5 Flash preview models from persisted custom lists', () => {
    localStorage.setItem(
      'custom_model_list_v1',
      JSON.stringify([
        { id: 'gemini-2.5-flash-preview-09-2025', name: 'Removed Flash' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
      ]),
    );

    const { result, unmount } = renderHook(() => useModels());

    expect(result.current.apiModels.map((model) => model.id)).toEqual(['gemini-3-flash-preview']);
    unmount();
  });
});
