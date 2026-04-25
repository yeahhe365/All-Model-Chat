import { describe, expect, it } from 'vitest';
import { getFilePollingDelayMs } from './useFilePolling';
import { POLLING_INTERVAL_MS } from '../../services/api/baseApi';

describe('getFilePollingDelayMs', () => {
  it('uses the base polling interval before failures', () => {
    expect(getFilePollingDelayMs(0)).toBe(POLLING_INTERVAL_MS);
  });

  it('backs off polling after repeated metadata failures', () => {
    expect(getFilePollingDelayMs(1)).toBe(POLLING_INTERVAL_MS * 2);
    expect(getFilePollingDelayMs(2)).toBe(POLLING_INTERVAL_MS * 4);
  });

  it('caps polling backoff so processing files still refresh periodically', () => {
    expect(getFilePollingDelayMs(10)).toBe(POLLING_INTERVAL_MS * 8);
  });
});
