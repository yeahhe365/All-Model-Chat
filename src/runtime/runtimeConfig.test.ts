import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getPyodideBaseUrl, getRuntimeConfigAppSettingsOverrides } from './runtimeConfig';

const setRuntimeConfig = (config: Record<string, unknown>) => {
  (window as Window & { __AMC_RUNTIME_CONFIG__?: Record<string, unknown> }).__AMC_RUNTIME_CONFIG__ = config;
};

describe('runtimeConfig', () => {
  afterEach(() => {
    delete window.__AMC_RUNTIME_CONFIG__;
  });

  it('returns empty overrides when runtime config is missing', () => {
    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({});
  });

  it('returns no Pyodide base URL override when runtime config is missing or blank', () => {
    expect(getPyodideBaseUrl()).toBeNull();

    setRuntimeConfig({
      pyodideBaseUrl: '   ',
    });

    expect(getPyodideBaseUrl()).toBeNull();
  });

  it('reads a trimmed Pyodide base URL override from window runtime config', () => {
    setRuntimeConfig({
      pyodideBaseUrl: '  https://cdn.example.com/pyodide/v0.25.1/full/  ',
    });

    expect(getPyodideBaseUrl()).toBe('https://cdn.example.com/pyodide/v0.25.1/full/');
  });

  it('reads supported app setting overrides from window runtime config', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: 'https://proxy.runtime.example/v1beta',
    };

    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: 'https://proxy.runtime.example/v1beta',
    });
  });

  it('converts string values into typed setting overrides', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      serverManagedApi: 'true',
      useCustomApiConfig: '1',
      useApiProxy: 'false',
      apiProxyUrl: '  ',
    };

    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: false,
      apiProxyUrl: null,
    });
  });

  it('does not ship a Live API token endpoint in the static runtime config', () => {
    const runtimeConfigSource = fs.readFileSync(path.resolve(__dirname, '../../public/runtime-config.js'), 'utf8');

    expect(runtimeConfigSource).not.toContain('liveApiEphemeralTokenEndpoint');
    expect(runtimeConfigSource).not.toContain('/api/live-token');
  });

  it('ships Pyodide with a nullable static runtime override', () => {
    const runtimeConfigSource = fs.readFileSync(path.resolve(__dirname, '../../public/runtime-config.js'), 'utf8');

    expect(runtimeConfigSource).toContain('pyodideBaseUrl: null');
  });

  it('defaults Docker runtime config to BYOK instead of server-managed credentials', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const webEntrypointSource = fs.readFileSync(path.join(projectRoot, 'docker/web-entrypoint.sh'), 'utf8');
    const composeSource = fs.readFileSync(path.join(projectRoot, 'docker-compose.yml'), 'utf8');
    const envExampleSource = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');

    expect(webEntrypointSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
    expect(webEntrypointSource).toContain('RUNTIME_PYODIDE_BASE_URL');
    expect(composeSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
    expect(composeSource).toContain('RUNTIME_PYODIDE_BASE_URL');
    expect(envExampleSource).toContain('GEMINI_API_KEY=');
    expect(envExampleSource).toContain('RUNTIME_SERVER_MANAGED_API=false');
    expect(envExampleSource).toContain('RUNTIME_PYODIDE_BASE_URL=');
    expect(envExampleSource).not.toContain('/api/live-token');
  });
});
