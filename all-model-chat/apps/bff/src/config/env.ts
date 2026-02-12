export interface BffConfig {
  host: string;
  port: number;
  nodeEnv: string;
  serviceName: string;
  providerApiKeys: string[];
  providerKeyFailureCooldownMs: number;
  providerUseVertexAi: boolean;
  providerBaseUrl?: string;
  providerApiVersion?: string;
}

const parsePort = (rawPort: string | undefined, fallback: number): number => {
  if (!rawPort) return fallback;

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid BFF_PORT value: ${rawPort}`);
  }

  return parsed;
};

const parsePositiveInteger = (rawValue: string | undefined, fallback: number, fieldName: string): number => {
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName} value: ${rawValue}`);
  }

  return parsed;
};

const parseBoolean = (rawValue: string | undefined, fallback: boolean, fieldName: string): boolean => {
  if (!rawValue) return fallback;

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  throw new Error(`Invalid ${fieldName} value: ${rawValue}`);
};

const parseOptionalString = (rawValue: string | undefined): string | undefined => {
  if (!rawValue) return undefined;

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseProviderApiKeys = (rawList: string | undefined, rawSingle: string | undefined): string[] => {
  const merged = [rawList || '', rawSingle || ''].join('\n');

  return merged
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
};

export const loadBffConfig = (): BffConfig => {
  return {
    host: process.env.BFF_HOST || '127.0.0.1',
    port: parsePort(process.env.BFF_PORT, 8787),
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: process.env.BFF_SERVICE_NAME || 'all-model-chat-bff',
    providerApiKeys: parseProviderApiKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY),
    providerKeyFailureCooldownMs: parsePositiveInteger(
      process.env.BFF_KEY_FAILURE_COOLDOWN_MS,
      30000,
      'BFF_KEY_FAILURE_COOLDOWN_MS'
    ),
    providerUseVertexAi: parseBoolean(process.env.BFF_PROVIDER_VERTEXAI, false, 'BFF_PROVIDER_VERTEXAI'),
    providerBaseUrl: parseOptionalString(process.env.BFF_PROVIDER_BASE_URL),
    providerApiVersion: parseOptionalString(process.env.BFF_PROVIDER_API_VERSION),
  };
};
