import type { AppSettings } from '../types/settings';

type RuntimeConfigKey =
  | 'serverManagedApi'
  | 'useCustomApiConfig'
  | 'useApiProxy'
  | 'apiProxyUrl'
  | 'projectUrl';

type RuntimeConfigShape = Partial<Record<RuntimeConfigKey, unknown>>;

export const DEFAULT_PROJECT_URL = 'https://all-model-chat.pages.dev/';

declare global {
  interface Window {
    __AMC_RUNTIME_CONFIG__?: RuntimeConfigShape;
  }
}

function readBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === null) {
    return null;
  }

  return undefined;
}

function getRuntimeConfig(): RuntimeConfigShape | undefined {
  return typeof window !== 'undefined' ? window.__AMC_RUNTIME_CONFIG__ : undefined;
}

export function getProjectUrl(): string {
  const projectUrl = readNullableString(getRuntimeConfig()?.projectUrl);

  return projectUrl ?? DEFAULT_PROJECT_URL;
}

export function getRuntimeConfigAppSettingsOverrides(): Partial<
  Pick<AppSettings, 'serverManagedApi' | 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>
> {
  const runtimeConfig = getRuntimeConfig();

  if (!runtimeConfig) {
    return {};
  }

  const overrides: Partial<Pick<AppSettings, 'serverManagedApi' | 'useCustomApiConfig' | 'useApiProxy' | 'apiProxyUrl'>> =
    {};

  const serverManagedApi = readBooleanValue(runtimeConfig.serverManagedApi);
  if (serverManagedApi !== undefined) {
    overrides.serverManagedApi = serverManagedApi;
  }

  const useCustomApiConfig = readBooleanValue(runtimeConfig.useCustomApiConfig);
  if (useCustomApiConfig !== undefined) {
    overrides.useCustomApiConfig = useCustomApiConfig;
  }

  const useApiProxy = readBooleanValue(runtimeConfig.useApiProxy);
  if (useApiProxy !== undefined) {
    overrides.useApiProxy = useApiProxy;
  }

  const apiProxyUrl = readNullableString(runtimeConfig.apiProxyUrl);
  if (apiProxyUrl !== undefined) {
    overrides.apiProxyUrl = apiProxyUrl;
  }

  return overrides;
}
