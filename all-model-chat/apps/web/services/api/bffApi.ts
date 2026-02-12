import type { BffErrorPayload } from '@all-model-chat/shared-api';

export const resolveBffEndpoint = (path: string): string => {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const configuredBaseUrl =
    typeof env?.VITE_BFF_BASE_URL === 'string' ? env.VITE_BFF_BASE_URL.trim() : '';

  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl.replace(/\/$/, '')}${path}`;
};

export const parseBffErrorResponse = async (response: Response): Promise<Error> => {
  let message = `BFF request failed with status ${response.status}.`;
  let parsedCode: string | undefined;
  let parsedRetryable: boolean | undefined;

  try {
    const text = await response.text();
    if (text) {
      const parsed = JSON.parse(text);
      const errorPayload = parsed?.error as BffErrorPayload | undefined;
      if (errorPayload?.message) {
        message = errorPayload.message;
      }
      parsedCode = errorPayload?.code;
      parsedRetryable = errorPayload?.retryable;
    }
  } catch {
    // fallback message stays
  }

  const error = new Error(message);
  (error as any).status = response.status;
  if (parsedCode) (error as any).code = parsedCode;
  if (typeof parsedRetryable === 'boolean') (error as any).retryable = parsedRetryable;
  return error;
};

export const fetchBffJson = async <T>(
  path: string,
  init: RequestInit,
  signal?: AbortSignal
): Promise<T> => {
  const response = await fetch(resolveBffEndpoint(path), {
    ...init,
    signal: signal || init.signal,
  });

  if (!response.ok) {
    throw await parseBffErrorResponse(response);
  }

  return (await response.json()) as T;
};
