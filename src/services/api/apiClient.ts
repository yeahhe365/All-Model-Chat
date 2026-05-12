import type { GoogleGenAI, Part } from '@google/genai';
import type { AppSettings } from '@/types';
import { DEFAULT_GEMINI_API_BASE_URL, normalizeGeminiApiBaseUrl } from '@/utils/apiProxyUrl';
import { dbService } from '@/services/db/dbService';
import { logService } from '@/services/logService';

export type ClientHttpOptions = {
  apiVersion?: 'v1alpha';
  baseUrl?: string;
};

type ClientConfig = {
  apiKey: string;
  httpOptions?: ClientHttpOptions;
};

const loadGoogleGenAI = async () => {
  const { GoogleGenAI } = await import('@google/genai');
  return GoogleGenAI;
};

export const getClient = async (
  apiKey: string,
  baseUrl?: string | null,
  httpOptions?: ClientHttpOptions,
): Promise<GoogleGenAI> => {
  try {
    const sanitizedApiKey = apiKey
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u00A0]/g, ' ');

    if (apiKey !== sanitizedApiKey) {
      logService.warn('API key was sanitized. Non-ASCII characters were replaced.');
    }

    const config: ClientConfig = { apiKey: sanitizedApiKey };
    const mergedHttpOptions = httpOptions ? { ...httpOptions } : undefined;

    if (baseUrl && baseUrl.trim().length > 0) {
      const sanitizedBaseUrl = normalizeGeminiApiBaseUrl(baseUrl);
      if (mergedHttpOptions) {
        mergedHttpOptions.baseUrl = sanitizedBaseUrl;
      } else {
        config.httpOptions = { baseUrl: sanitizedBaseUrl };
      }
    }

    if (mergedHttpOptions) {
      config.httpOptions = mergedHttpOptions;
    }

    const GoogleGenAIConstructor = await loadGoogleGenAI();
    return new GoogleGenAIConstructor(config);
  } catch (error) {
    logService.error('Failed to initialize GoogleGenAI client:', error);
    throw error;
  }
};

const resolveConfiguredBaseUrl = (
  appSettings: Pick<AppSettings, 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>,
): string | null => {
  const shouldUseProxy = !!(appSettings.useCustomApiConfig && appSettings.useApiProxy);
  return shouldUseProxy ? (appSettings.apiProxyUrl ?? null) : null;
};

const isAbsoluteHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url.trim());

export const resolveLiveClientBaseUrl = (
  appSettings: Pick<AppSettings, 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>,
): string | null => {
  const configuredBaseUrl = resolveConfiguredBaseUrl(appSettings);
  if (!configuredBaseUrl) {
    return null;
  }

  const normalizedConfiguredBaseUrl = normalizeGeminiApiBaseUrl(configuredBaseUrl);
  return isAbsoluteHttpUrl(normalizedConfiguredBaseUrl) ? normalizedConfiguredBaseUrl : null;
};

export const getConfiguredApiClient = async (apiKey: string, httpOptions?: ClientHttpOptions): Promise<GoogleGenAI> => {
  const settings = await dbService.getAppSettings();

  const shouldUseProxy = !!(settings?.useCustomApiConfig && settings?.useApiProxy);
  const apiProxyUrl = shouldUseProxy ? settings?.apiProxyUrl : null;

  if (settings?.useCustomApiConfig && !shouldUseProxy && settings?.apiProxyUrl && !settings?.useApiProxy) {
    logService.debug("[API Config] Proxy URL present but 'Use API Proxy' toggle is OFF.");
  }

  return getClient(apiKey, apiProxyUrl, httpOptions);
};

export const getConfiguredApiBaseUrl = async (): Promise<string> => {
  const settings = await dbService.getAppSettings();
  const configuredBaseUrl = settings ? resolveConfiguredBaseUrl(settings) : null;

  return normalizeGeminiApiBaseUrl(configuredBaseUrl ?? DEFAULT_GEMINI_API_BASE_URL);
};

export const getConfiguredProxyBaseUrl = async (): Promise<string | null> => {
  const settings = await dbService.getAppSettings();
  const configuredBaseUrl = settings ? resolveConfiguredBaseUrl(settings) : null;

  return configuredBaseUrl ? normalizeGeminiApiBaseUrl(configuredBaseUrl) : null;
};

const hasPerPartMediaResolution = (parts: Part[] = []): boolean =>
  parts.some((part) => Boolean((part as Part & { mediaResolution?: unknown }).mediaResolution));

export const getHttpOptionsForContents = (
  contents: Array<{ parts?: Part[] }>,
): { apiVersion: 'v1alpha' } | undefined => {
  if (contents.some((content) => hasPerPartMediaResolution(content.parts))) {
    return { apiVersion: 'v1alpha' };
  }

  return undefined;
};
