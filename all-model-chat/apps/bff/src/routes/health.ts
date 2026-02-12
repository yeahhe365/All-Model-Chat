import { BffConfig } from '../config/env.js';
import { KeyPoolSnapshot } from '../providers/keyPool.js';

export const createHealthPayload = (config: BffConfig, keyPool: KeyPoolSnapshot) => {
  return {
    status: 'ok',
    service: config.serviceName,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    provider: {
      configuredKeyCount: keyPool.configuredKeyCount,
      availableKeyCount: keyPool.availableKeyCount,
      failureCooldownMs: keyPool.failureCooldownMs,
      keys: keyPool.keys,
    },
  };
};
