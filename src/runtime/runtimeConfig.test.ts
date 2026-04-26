import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeConfigAppSettingsOverrides } from './runtimeConfig';

describe('runtimeConfig', () => {
  afterEach(() => {
    delete window.__AMC_RUNTIME_CONFIG__;
  });

  it('returns empty overrides when runtime config is missing', () => {
    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({});
  });

  it('reads supported app setting overrides from window runtime config', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: 'https://proxy.runtime.example/v1beta',
      liveApiEphemeralTokenEndpoint: '/api/live-token',
    };

    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: 'https://proxy.runtime.example/v1beta',
      liveApiEphemeralTokenEndpoint: '/api/live-token',
    });
  });

  it('converts string values into typed setting overrides', () => {
    window.__AMC_RUNTIME_CONFIG__ = {
      serverManagedApi: 'true',
      useCustomApiConfig: '1',
      useApiProxy: 'false',
      apiProxyUrl: '  ',
      liveApiEphemeralTokenEndpoint: '   ',
    };

    expect(getRuntimeConfigAppSettingsOverrides()).toEqual({
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: false,
      apiProxyUrl: null,
      liveApiEphemeralTokenEndpoint: null,
    });
  });

  it('ships a default Live API token endpoint in the static runtime config', () => {
    const runtimeConfigSource = fs.readFileSync(
      path.resolve(__dirname, '../../public/runtime-config.js'),
      'utf8',
    );

    expect(runtimeConfigSource).toContain("liveApiEphemeralTokenEndpoint: '/api/live-token'");
  });

  it('defaults Docker runtime config to BYOK instead of server-managed credentials', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const webEntrypointSource = fs.readFileSync(
      path.join(projectRoot, 'docker/web-entrypoint.sh'),
      'utf8',
    );
    const composeSource = fs.readFileSync(
      path.join(projectRoot, 'docker-compose.yml'),
      'utf8',
    );

    expect(webEntrypointSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
    expect(composeSource).toContain('RUNTIME_SERVER_MANAGED_API:-false');
  });
});
