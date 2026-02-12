import { BffConfig } from '../config/env.js';

export const createHealthPayload = (config: BffConfig) => {
  return {
    status: 'ok',
    service: config.serviceName,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
};
