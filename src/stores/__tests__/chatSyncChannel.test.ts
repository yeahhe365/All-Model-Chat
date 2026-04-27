import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncMessage } from '../../types/sync';

describe('chatSyncChannel', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('broadcasts sync messages on the shared chat channel', async () => {
    const postMessage = vi.fn();
    const BroadcastChannelMock = vi.fn(function () {
      return {
        postMessage,
        onmessage: null,
        close: vi.fn(),
      };
    });
    vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);

    const { broadcastSyncMessage } = await import('../chatSyncChannel');
    const message: SyncMessage = { type: 'SESSIONS_UPDATED' };

    broadcastSyncMessage(message);

    expect(BroadcastChannelMock).toHaveBeenCalledWith('all_model_chat_sync_v1');
    expect(postMessage).toHaveBeenCalledWith(message);
  });

  it('ignores broadcast failures from restricted browser environments', async () => {
    const postMessage = vi.fn(() => {
      throw new Error('blocked');
    });
    vi.stubGlobal(
      'BroadcastChannel',
      vi.fn(function () {
        return {
          postMessage,
          onmessage: null,
          close: vi.fn(),
        };
      }),
    );

    const { broadcastSyncMessage } = await import('../chatSyncChannel');

    expect(() => broadcastSyncMessage({ type: 'GROUPS_UPDATED' })).not.toThrow();
  });
});
