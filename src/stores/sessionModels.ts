import { DEFAULT_MODEL_ID } from '@/constants/modelConstants';
import type { SavedChatSession } from '@/types';
import { resolveSupportedModelId } from '@/utils/modelHelpers';

export function sortSessionsInPlace<T extends Pick<SavedChatSession, 'isPinned' | 'timestamp'>>(sessions: T[]): T[] {
  sessions.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
  return sessions;
}

export function shouldRetainRuntimeMessages(
  sessionId: string,
  activeSessionId: string | null,
  loadingSessionIds: Set<string>,
) {
  return sessionId === activeSessionId || loadingSessionIds.has(sessionId);
}

export function sanitizeSessionModel(
  session: SavedChatSession,
  fallbackModelId: string = DEFAULT_MODEL_ID,
): SavedChatSession {
  return {
    ...session,
    settings: {
      ...session.settings,
      modelId: resolveSupportedModelId(session.settings?.modelId, fallbackModelId),
    },
  };
}
