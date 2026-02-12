import { createServer } from 'node:http';
import { loadBffConfig } from './config/env.js';
import { createHealthPayload } from './routes/health.js';
import { ProviderKeyPool } from './providers/keyPool.js';
import { GeminiProviderClient } from './providers/geminiClient.js';

const config = loadBffConfig();
const keyPool = new ProviderKeyPool(config.providerApiKeys, {
  failureCooldownMs: config.providerKeyFailureCooldownMs,
});
const geminiProviderClient = new GeminiProviderClient(keyPool);

const server = createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Invalid request URL' }));
    return;
  }

  const method = request.method || 'GET';
  const path = request.url.split('?')[0];

  if (method === 'GET' && path === '/health') {
    const payload = createHealthPayload(config, geminiProviderClient.getKeyPoolSnapshot());
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(config.port, config.host, () => {
  console.log(`[BFF] ${config.serviceName} listening on http://${config.host}:${config.port}`);
  console.log(`[BFF] Provider key pool initialized with ${config.providerApiKeys.length} key(s).`);
});
