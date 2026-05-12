import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import { useSettingsLogic } from './useSettingsLogic';
import { renderHook } from '@/test/testUtils';
import { useSettingsUiStore } from '@/stores/settingsUiStore';

describe('useSettingsLogic', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
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
    useSettingsUiStore.setState({
      activeTab: 'models',
      scrollPositions: {},
      legacySettingsUiHydrated: false,
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

  it('does not include the legacy Canvas tab in the settings sidebar model', () => {
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

    expect(result.current.tabs.map((tab) => tab.id)).not.toContain('canvas');
    unmount();
  });

  it('does not include the merged language and voice tab in the settings sidebar model', () => {
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

    expect(result.current.tabs.map((tab) => tab.id)).not.toContain('languageVoice');
    unmount();
  });

  it('restores legacy grouped chat tabs to the models tab', () => {
    storage.set('chatSettingsLastTab', 'chat');

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

    expect(result.current.activeTab).toBe('models');
    unmount();
  });

  it('restores the removed model behavior tab to the models tab', () => {
    storage.set('chatSettingsLastTab', 'generation');

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

    expect(result.current.activeTab).toBe('models');
    unmount();
  });

  it('restores the legacy Canvas tab to the models tab', () => {
    storage.set('chatSettingsLastTab', 'canvas');

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

    expect(result.current.activeTab).toBe('models');
    unmount();
  });

  it('restores the merged language and voice tab to the models tab', () => {
    storage.set('chatSettingsLastTab', 'languageVoice');

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

    expect(result.current.activeTab).toBe('models');
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
