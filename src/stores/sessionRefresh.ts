import type { SavedChatSession } from '../types';
import {
  sanitizeSessionModel,
  shouldRetainRuntimeMessages,
  sortSessionsInPlace,
} from './sessionModels';

interface MergeSessionMetadataOptions {
  activeSessionId: string | null;
  loadingSessionIds: Set<string>;
}

export function mergeSessionMetadata(
  previousSessions: SavedChatSession[],
  metadataList: SavedChatSession[],
  { activeSessionId, loadingSessionIds }: MergeSessionMetadataOptions,
): SavedChatSession[] {
  const sanitizedMetadata = metadataList.map((session) => sanitizeSessionModel(session));
  sortSessionsInPlace(sanitizedMetadata);

  const previousById = new Map(previousSessions.map((session) => [session.id, session]));
  const merged = sanitizedMetadata.map((session) => {
    const existing = previousById.get(session.id);

    if (!existing) {
      return session;
    }

    previousById.delete(session.id);

    const keepRuntimeMessages = shouldRetainRuntimeMessages(session.id, activeSessionId, loadingSessionIds);

    return {
      ...session,
      ...existing,
      settings: {
        ...session.settings,
        ...existing.settings,
      },
      messages: keepRuntimeMessages ? existing.messages : [],
    };
  });

  const nextSessions = [...merged, ...previousById.values()];
  sortSessionsInPlace(nextSessions);
  return nextSessions;
}
