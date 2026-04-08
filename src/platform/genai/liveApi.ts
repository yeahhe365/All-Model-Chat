import { LiveServerMessage, Session, Part } from '@google/genai';
import { getLiveTextTransport, normalizeModelId } from './modelCatalog';

type LiveTextSession = Pick<Session, 'sendClientContent' | 'sendRealtimeInput'>;

const GEMINI_31_FLASH_LIVE_SEGMENT = 'gemini-3.1-flash-live';

export const isGemini31FlashLiveModel = (modelId: string) =>
  normalizeModelId(modelId).includes(GEMINI_31_FLASH_LIVE_SEGMENT);

export const sendLiveText = (session: LiveTextSession, modelId: string, text: string) => {
  if (getLiveTextTransport(modelId) === 'realtime-input') {
    session.sendRealtimeInput({ text });
    return;
  }

  session.sendClientContent({
    turns: [{ role: 'user', parts: [{ text }] }],
    turnComplete: true,
  });
};

export const getLiveModelTurnParts = (message: LiveServerMessage): Part[] =>
  message.serverContent?.modelTurn?.parts ?? [];

export const getLiveInlineAudioData = (part: Part): string | null => {
  const mimeType = part.inlineData?.mimeType?.toLowerCase();
  const data = part.inlineData?.data;

  if (!data) {
    return null;
  }

  if (!mimeType || mimeType.startsWith('audio/')) {
    return data;
  }

  return null;
};
