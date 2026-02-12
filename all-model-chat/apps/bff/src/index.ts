import { createServer } from 'node:http';
import { loadBffConfig } from './config/env.js';
import { createHealthPayload } from './routes/health.js';

const config = loadBffConfig();

const server = createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Invalid request URL' }));
    return;
  }

  const method = request.method || 'GET';
  const path = request.url.split('?')[0];

  if (method === 'GET' && path === '/health') {
    const payload = createHealthPayload(config);
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(config.port, config.host, () => {
  console.log(`[BFF] ${config.serviceName} listening on http://${config.host}:${config.port}`);
});
