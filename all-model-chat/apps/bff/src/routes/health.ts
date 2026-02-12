import { BffConfig } from '../config/env.js';
import { KeyPoolSnapshot } from '../providers/keyPool.js';
import type { GeminiProviderClient } from '../providers/geminiClient.js';

export const createHealthPayload = (
  config: BffConfig,
  keyPool: KeyPoolSnapshot,
  providerConfig: ReturnType<GeminiProviderClient['getProviderConfigSnapshot']>
) => {
  return {
    status: 'ok',
    service: config.serviceName,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    provider: {
      useVertexAi: providerConfig.useVertexAi,
      baseUrl: providerConfig.baseUrl,
      apiVersion: providerConfig.apiVersion,
      configuredKeyCount: keyPool.configuredKeyCount,
      availableKeyCount: keyPool.availableKeyCount,
      failureCooldownMs: keyPool.failureCooldownMs,
      keys: keyPool.keys,
    },
  };
};
