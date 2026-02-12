import { createServer } from 'node:http';
import { loadBffConfig } from './config/env.js';
import { createHealthPayload } from './routes/health.js';
import { ProviderKeyPool } from './providers/keyPool.js';
import { GeminiProviderClient } from './providers/geminiClient.js';
import { handleChatStreamRoute } from './routes/chatStream.js';
import { handleFilesRoute } from './routes/files.js';
import { handleGenerationRoute } from './routes/generation.js';

const config = loadBffConfig();
const keyPool = new ProviderKeyPool(config.providerApiKeys, {
  failureCooldownMs: config.providerKeyFailureCooldownMs,
});
const geminiProviderClient = new GeminiProviderClient(keyPool, {
  useVertexAi: config.providerUseVertexAi,
  baseUrl: config.providerBaseUrl,
  apiVersion: config.providerApiVersion,
});

const server = createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Invalid request URL' }));
    return;
  }

  const method = request.method || 'GET';
  const path = request.url.split('?')[0];

  if (method === 'GET' && path === '/health') {
    const payload = createHealthPayload(
      config,
      geminiProviderClient.getKeyPoolSnapshot(),
      geminiProviderClient.getProviderConfigSnapshot()
    );
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
    return;
  }

  if (path === '/api/chat/stream') {
    if (method !== 'POST') {
      response.writeHead(405, {
        'content-type': 'application/json; charset=utf-8',
        allow: 'POST',
      });
      response.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    handleChatStreamRoute(request, response, geminiProviderClient).catch((error) => {
      if (response.writableEnded) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unexpected stream proxy failure.';
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          error: {
            code: 'internal_error',
            message,
            status: 500,
          },
        })
      );
    });
    return;
  }

  if (path.startsWith('/api/files/')) {
    handleFilesRoute(request, response, geminiProviderClient).catch((error) => {
      if (response.writableEnded) return;
      const message = error instanceof Error ? error.message : 'Unexpected files route failure.';
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          error: {
            code: 'internal_error',
            message,
            status: 500,
          },
        })
      );
    });
    return;
  }

  if (path.startsWith('/api/generation/')) {
    handleGenerationRoute(request, response, geminiProviderClient).catch((error) => {
      if (response.writableEnded) return;
      const message = error instanceof Error ? error.message : 'Unexpected generation route failure.';
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          error: {
            code: 'internal_error',
            message,
            status: 500,
          },
        })
      );
    });
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(config.port, config.host, () => {
  console.log(`[BFF] ${config.serviceName} listening on http://${config.host}:${config.port}`);
  console.log(`[BFF] Provider key pool initialized with ${config.providerApiKeys.length} key(s).`);
  console.log(
    `[BFF] Provider mode: ${config.providerUseVertexAi ? 'vertexai' : 'gemini-api'} (baseUrl=${
      config.providerBaseUrl || 'default'
    }, apiVersion=${config.providerApiVersion || 'default'})`
  );
});
