import { describe, expect, it, vi } from 'vitest';
import { registerPwa } from './register';

describe('registerPwa', () => {
  it('returns a no-op updater when registration is disabled', async () => {
    const registerSWImpl = vi.fn();
    const updateServiceWorker = registerPwa({
      enabled: false,
      registerSWImpl,
    });

    await expect(updateServiceWorker(true)).resolves.toBeUndefined();
    expect(registerSWImpl).not.toHaveBeenCalled();
  });

  it('delegates to vite-plugin-pwa registration when enabled', () => {
    const updateServiceWorker = vi.fn();
    const registerSWImpl = vi.fn().mockReturnValue(updateServiceWorker);
    const onNeedRefresh = vi.fn();
    const onOfflineReady = vi.fn();

    const result = registerPwa({
      enabled: true,
      registerSWImpl,
      onNeedRefresh,
      onOfflineReady,
    });

    expect(registerSWImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onNeedRefresh,
        onOfflineReady,
      }),
    );
    expect(result).toBe(updateServiceWorker);
  });
});
