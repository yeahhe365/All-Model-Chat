import type { GoogleGenAI } from '@google/genai';
import type { AppSettings } from '../../types';
import { getClient, resolveLiveClientBaseUrl, type ClientHttpOptions } from './apiClient';

export class LiveApiAuthConfigurationError extends Error {
  code:
    | 'MISSING_EPHEMERAL_TOKEN_ENDPOINT'
    | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN'
    | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP'
    | 'INVALID_EPHEMERAL_TOKEN_RESPONSE'
    | 'MISSING_EPHEMERAL_TOKEN';

  constructor(
    code:
      | 'MISSING_EPHEMERAL_TOKEN_ENDPOINT'
      | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN'
      | 'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP'
      | 'INVALID_EPHEMERAL_TOKEN_RESPONSE'
      | 'MISSING_EPHEMERAL_TOKEN',
    message: string,
  ) {
    super(message);
    this.name = 'LiveApiAuthConfigurationError';
    this.code = code;
  }
}

const extractLiveApiToken = (payload: unknown): string | null => {
  if (typeof payload === 'string') {
    return payload.trim() || null;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const tokenPayload = payload as Record<string, unknown>;
  const token =
    tokenPayload.name ??
    tokenPayload.token ??
    tokenPayload.ephemeralToken ??
    tokenPayload.authToken;

  return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
};

export const getLiveApiClient = async (
  appSettings: Pick<AppSettings, 'liveApiEphemeralTokenEndpoint' | 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>,
  httpOptions?: ClientHttpOptions,
  apiKeyForTokenCreation?: string | null,
): Promise<GoogleGenAI> => {
  const endpoint = appSettings.liveApiEphemeralTokenEndpoint?.trim();

  if (!endpoint) {
    throw new LiveApiAuthConfigurationError(
      'MISSING_EPHEMERAL_TOKEN_ENDPOINT',
      'Live API requires an ephemeral token endpoint.',
    );
  }

  let response: Response;
  try {
    const trimmedApiKey = apiKeyForTokenCreation?.trim();
    const liveClientBaseUrl = resolveLiveClientBaseUrl(appSettings);
    const tokenRequestBody = trimmedApiKey
      ? {
          apiKey: trimmedApiKey,
          ...(liveClientBaseUrl ? { apiBaseUrl: liveClientBaseUrl } : {}),
        }
      : null;
    response = trimmedApiKey
      ? await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(tokenRequestBody),
        })
      : await fetch(endpoint);
  } catch (error) {
    throw new LiveApiAuthConfigurationError(
      'FAILED_TO_FETCH_EPHEMERAL_TOKEN',
      error instanceof Error ? error.message : 'Failed to fetch Live API ephemeral token.',
    );
  }

  if (!response.ok) {
    throw new LiveApiAuthConfigurationError(
      'FAILED_TO_FETCH_EPHEMERAL_TOKEN_HTTP',
      `Failed to fetch Live API ephemeral token (${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LiveApiAuthConfigurationError(
      'INVALID_EPHEMERAL_TOKEN_RESPONSE',
      'Live API token endpoint must return JSON.',
    );
  }

  const token = extractLiveApiToken(payload);
  if (!token) {
    throw new LiveApiAuthConfigurationError(
      'MISSING_EPHEMERAL_TOKEN',
      'Live API token endpoint response must include `name` or `token`.',
    );
  }

  return getClient(token, resolveLiveClientBaseUrl(appSettings), httpOptions);
};
