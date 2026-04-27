import type { SyncMessage } from '../types/sync';

const CHAT_SYNC_CHANNEL_NAME = 'all_model_chat_sync_v1';

let syncChannel: BroadcastChannel | null = null;

export function getChatSyncChannel(): BroadcastChannel {
  if (!syncChannel) {
    syncChannel = new BroadcastChannel(CHAT_SYNC_CHANNEL_NAME);
  }
  return syncChannel;
}

export function broadcastSyncMessage(msg: SyncMessage) {
  try {
    getChatSyncChannel().postMessage(msg);
  } catch {
    // Ignore sync failures in unsupported or restricted environments.
  }
}
