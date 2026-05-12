import type { GoogleGenAI } from '@google/genai';
import { logService } from '@/services/logService';
import { getConfiguredApiClient, type ClientHttpOptions } from './apiClient';

type ApiExecutorContext = {
  client: GoogleGenAI;
};

interface ExecuteConfiguredApiRequestOptions<T> {
  apiKey: string;
  label: string;
  errorLabel?: string;
  abortSignal?: AbortSignal;
  httpOptions?: ClientHttpOptions;
  run: (context: ApiExecutorContext) => Promise<T>;
}

const createAbortError = (message: string): Error => {
  const abortError = new Error(message);
  abortError.name = 'AbortError';
  return abortError;
};

const throwIfAborted = (abortSignal: AbortSignal | undefined, message: string) => {
  if (abortSignal?.aborted) {
    throw createAbortError(message);
  }
};

export const executeConfiguredApiRequest = async <T>({
  apiKey,
  label,
  errorLabel = label,
  abortSignal,
  httpOptions,
  run,
}: ExecuteConfiguredApiRequestOptions<T>): Promise<T> => {
  throwIfAborted(abortSignal, `${label} cancelled by user before starting.`);
  logService.info(label);

  try {
    const client = await getConfiguredApiClient(apiKey, httpOptions);
    throwIfAborted(abortSignal, `${label} cancelled by user.`);
    const result = await run({ client });
    throwIfAborted(abortSignal, `${label} cancelled by user.`);
    return result;
  } catch (error) {
    logService.error(errorLabel, error);
    throw error;
  }
};
