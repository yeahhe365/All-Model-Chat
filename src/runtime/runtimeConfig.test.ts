import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getProjectUrl, getRuntimeConfigAppSettingsOverrides } from './runtimeConfig';

describe('runtimeConfig', () => {
  afterEach(() => {
    delete window.__AMC_RUNTIME_CONFIG__;
  });

  it('returns empty overrides when runtime config is missing', () => {
    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({});
  });

  it('returns the default project URL when runtime config is missing', () => {
    expect(getProjectUrl()).toBe('https://all-model-chat.pages.dev/');
  });

  it('reads the project URL from window runtime config', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      projectUrl: 'https://deploy.example/amc',
    };

    expect(getProjectUrl()).toBe('https://deploy.example/amc');
  });

  it('falls back to the default project URL when runtime config projectUrl is blank', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      projectUrl: '   ',
    };

    expect(getProjectUrl()).toBe('https://all-model-chat.pages.dev/');
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

  it('defaults Docker runtime config to BYOK instead of server-managed credentials', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const webEntrypointSource = fs.readFileSync(path.join(projectRoot, 'docker/web-entrypoint.sh'), 'utf8');
    const composeSource = fs.readFileSync(path.join(projectRoot, 'docker-compose.yml'), 'utf8');
    const envExampleSource = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');

    expect(webEntrypointSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
    expect(composeSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
    expect(envExampleSource).toContain('GEMINI_API_KEY=');
    expect(envExampleSource).toContain('RUNTIME_SERVER_MANAGED_API=false');
    expect(envExampleSource).not.toContain('/api/live-token');
  });
});
