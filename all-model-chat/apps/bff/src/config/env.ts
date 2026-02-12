export interface BffConfig {
  host: string;
  port: number;
  nodeEnv: string;
  serviceName: string;
}

const parsePort = (rawPort: string | undefined, fallback: number): number => {
  if (!rawPort) return fallback;

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid BFF_PORT value: ${rawPort}`);
  }

  return parsed;
};

export const loadBffConfig = (): BffConfig => {
  return {
    host: process.env.BFF_HOST || '127.0.0.1',
    port: parsePort(process.env.BFF_PORT, 8787),
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: process.env.BFF_SERVICE_NAME || 'all-model-chat-bff',
  };
};
