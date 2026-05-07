import { beforeEach, describe, expect, it, vi } from 'vitest';

const importFreshSettingsUiStore = async () => {
  vi.resetModules();
  return import('./settingsUiStore');
};

describe('settingsUiStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates legacy tab aliases into the unified settings UI store', async () => {
    localStorage.setItem('chatSettingsLastTab', 'generation');

    const { useSettingsUiStore } = await importFreshSettingsUiStore();

    expect(useSettingsUiStore.getState().activeTab).toBe('models');
  });

  it('hydrates per-tab legacy scroll positions', async () => {
    localStorage.setItem('chatSettingsScroll_api', '42');

    const { useSettingsUiStore } = await importFreshSettingsUiStore();

    expect(useSettingsUiStore.getState().scrollPositions.api).toBe(42);
  });
});
