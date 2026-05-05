import { describe, expect, it, vi } from 'vitest';
import { createMockBroadcastChannel, createMockDbService, createMockLogService } from './serviceTestDoubles';

describe('serviceTestDoubles', () => {
  it('creates a dbService mock with async no-op defaults and overrides', async () => {
    const dbService = createMockDbService({
      getSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
    });

    await expect(dbService.getAllSessionMetadata()).resolves.toEqual([]);
    await expect(dbService.getSession('session-1')).resolves.toEqual({ id: 'session-1' });
    expect(dbService.getSession).toHaveBeenCalledWith('session-1');
  });

  it('creates a logService mock with standard logger methods', () => {
    const logService = createMockLogService();

    logService.error('failed');
    logService.warn('careful');
    logService.info('hello');
    logService.debug('details');

    expect(logService.error).toHaveBeenCalledWith('failed');
    expect(logService.warn).toHaveBeenCalledWith('careful');
    expect(logService.info).toHaveBeenCalledWith('hello');
    expect(logService.debug).toHaveBeenCalledWith('details');
  });

  it('creates inspectable BroadcastChannel instances', () => {
    const { BroadcastChannelMock, instances } = createMockBroadcastChannel();
    const channel = new BroadcastChannelMock('chat-sync');

    channel.postMessage({ type: 'ping' });
    channel.close();

    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('chat-sync');
    expect(instances[0].postMessage).toHaveBeenCalledWith({ type: 'ping' });
    expect(instances[0].close).toHaveBeenCalled();
  });
});
