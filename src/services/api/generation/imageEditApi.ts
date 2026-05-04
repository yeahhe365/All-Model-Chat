import type { Part } from '@google/genai';
import type { ChatHistoryItem, EditImageRequestConfig } from '../../../types';
import { buildGenerationConfig } from '../generationConfig';
import { sendStatelessMessageNonStreamApi } from '../chatApi';

export const editImageApi = async (
  apiKey: string,
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  abortSignal: AbortSignal,
  aspectRatio?: string,
  imageSize?: string,
  requestConfig?: EditImageRequestConfig,
): Promise<Part[]> => {
  if (abortSignal.aborted) {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    throw abortError;
  }

  const config = await buildGenerationConfig({
    modelId,
    systemInstruction: requestConfig?.systemInstruction || '',
    config: {},
    showThoughts: requestConfig?.showThoughts ?? false,
    thinkingBudget: requestConfig?.thinkingBudget ?? 0,
    isGoogleSearchEnabled: !!requestConfig?.isGoogleSearchEnabled,
    isCodeExecutionEnabled: false,
    isUrlContextEnabled: false,
    thinkingLevel: requestConfig?.thinkingLevel,
    aspectRatio,
    isDeepSearchEnabled: !!requestConfig?.isDeepSearchEnabled,
    imageSize,
    safetySettings: requestConfig?.safetySettings,
    imageOutputMode: requestConfig?.imageOutputMode,
    personGeneration: requestConfig?.personGeneration,
  });

  return new Promise((resolve, reject) => {
    if (abortSignal.aborted) {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      reject(abortError);
      return;
    }

    sendStatelessMessageNonStreamApi(apiKey, modelId, history, parts, config, abortSignal, reject, (responseParts) =>
      resolve(responseParts),
    ).catch(reject);
  });
};
