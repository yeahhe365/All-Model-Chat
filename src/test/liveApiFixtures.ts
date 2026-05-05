import type { MutableRefObject } from 'react';
import type { LiveServerMessage, Session as LiveSession } from '@google/genai';

export const createLiveSessionStub = (overrides: Partial<LiveSession> = {}): LiveSession => overrides as LiveSession;

export const createLiveSessionRef = (
  session: LiveSession | null = null,
): MutableRefObject<Promise<LiveSession> | null> => ({
  current: session ? Promise.resolve(session) : null,
});

export const createLiveServerMessage = (message: Partial<LiveServerMessage>): LiveServerMessage =>
  message as LiveServerMessage;

export const createLiveToolCall = (
  toolCall: NonNullable<LiveServerMessage['toolCall']>,
): NonNullable<LiveServerMessage['toolCall']> => toolCall;
