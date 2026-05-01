import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModels } from './useModels';
import { renderHook } from '@/test/testUtils';

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

  it('keeps legacy Gemini 2.5 Flash preview models in persisted custom lists', () => {
    localStorage.setItem(
      'custom_model_list_v1',
      JSON.stringify([
        { id: 'gemini-2.5-flash-preview-09-2025', name: 'Removed Flash' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
      ]),
    );

    const { result, unmount } = renderHook(() => useModels());

    expect(result.current.apiModels.map((model) => model.id)).toEqual([
      'gemini-2.5-flash-preview-09-2025',
      'gemini-3-flash-preview',
    ]);
    unmount();
  });

  it('deduplicates duplicate model ids when saving custom lists', () => {
    const { result, unmount } = renderHook(() => useModels());

    act(() => {
      result.current.setApiModels([
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
        { id: 'gemini-3-flash-preview', name: 'Duplicate Gemini 3 Flash' },
        { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
      ]);
    });

    expect(result.current.apiModels.map((model) => model.id)).toEqual(['gemini-3-flash-preview', 'gemma-4-31b-it']);
    expect(JSON.parse(localStorage.getItem('custom_model_list_v1') || '[]')).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    ]);
    unmount();
  });

  it('updates models when another tab writes to storage', () => {
    const { result, unmount } = renderHook(() => useModels());

    act(() => {
      localStorage.setItem(
        'custom_model_list_v1',
        JSON.stringify([{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }]),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'custom_model_list_v1',
          newValue: localStorage.getItem('custom_model_list_v1'),
        }),
      );
    });

    expect(result.current.apiModels).toEqual([{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }]);
    unmount();
  });
});
