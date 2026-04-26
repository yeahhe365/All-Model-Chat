// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, createLiveTokenWithGemini } from './createServer';
import type { AddressInfo } from 'node:net';
import http from 'node:http';

const genAiMock = vi.hoisted(() => ({
  authTokensCreate: vi.fn(),
  constructorArgs: [] as unknown[],
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function GoogleGenAIMock(this: unknown, options: unknown) {
    genAiMock.constructorArgs.push(options);
    return {
      authTokens: {
        create: genAiMock.authTokensCreate,
      },
    };
  }),
}));

async function startHttpServer(server: http.Server): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

const cleanupCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  genAiMock.authTokensCreate.mockReset();
  genAiMock.constructorArgs.length = 0;

  while (cleanupCallbacks.length) {
    const close = cleanupCallbacks.pop();
    if (close) {
      await close();
    }
  }
});

describe('createServer', () => {
  it('creates a single-use Live API token with the server-side Gemini client', async () => {
    genAiMock.authTokensCreate.mockResolvedValue({ name: 'tokens/mock-token' });

    const token = await createLiveTokenWithGemini('server-key');

    expect(token).toEqual({ name: 'tokens/mock-token' });
    expect(genAiMock.constructorArgs).toEqual([
      {
        apiKey: 'server-key',
        httpOptions: { apiVersion: 'v1alpha' },
      },
    ]);
    expect(genAiMock.authTokensCreate).toHaveBeenCalledWith({ config: { uses: 1 } });
  });

  it('creates a Live API token through a configured proxy base URL', async () => {
    genAiMock.authTokensCreate.mockResolvedValue({ name: 'tokens/mock-token' });

    const token = await createLiveTokenWithGemini('server-key', 'http://localhost:7860/v1alpha/');

    expect(token).toEqual({ name: 'tokens/mock-token' });
    expect(genAiMock.constructorArgs).toEqual([
      {
        apiKey: 'server-key',
        httpOptions: {
          apiVersion: 'v1alpha',
          baseUrl: 'http://host.docker.internal:7860',
        },
      },
    ]);
  });

  it('returns health details from GET /health', async () => {
    const app = createServer({
      geminiApiBase: 'https://generativelanguage.googleapis.com',
      geminiApiKey: 'server-key',
    });
    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/health`);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns a Live API token payload from GET /api/live-token', async () => {
    const createLiveToken = vi.fn(async (apiKey: string) => ({ name: `tokens/${apiKey}` }));
    const app = createServer(
      {
        geminiApiBase: 'https://generativelanguage.googleapis.com',
        geminiApiKey: 'server-key',
      },
      { createLiveToken },
    );

    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/live-token`);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({ name: 'tokens/server-key' });
    expect(createLiveToken).toHaveBeenCalledWith('server-key');
  });

  it('creates a Live API token from a posted browser API key when no server key is configured', async () => {
    const createLiveToken = vi.fn(async (apiKey: string) => ({ name: `tokens/${apiKey}` }));
    const app = createServer(
      {
        geminiApiBase: 'https://generativelanguage.googleapis.com',
        geminiApiKey: '',
      },
      { createLiveToken },
    );

    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/live-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: 'browser-key' }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({ name: 'tokens/browser-key' });
    expect(createLiveToken).toHaveBeenCalledWith('browser-key');
  });

  it('passes the posted proxy base URL to BYOK live token creation using a Docker host URL', async () => {
    const createLiveToken = vi.fn(async (apiKey: string, apiBaseUrl?: string) => ({
      name: `tokens/${apiKey}/${apiBaseUrl}`,
    }));
    const app = createServer(
      {
        geminiApiBase: 'https://generativelanguage.googleapis.com',
        geminiApiKey: '',
      },
      { createLiveToken },
    );

    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/live-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'browser-key',
        apiBaseUrl: 'http://localhost:7860/v1alpha/',
      }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ name: 'tokens/browser-key/http://host.docker.internal:7860' });
    expect(createLiveToken).toHaveBeenCalledWith('browser-key', 'http://host.docker.internal:7860');
  });

  it('ignores relative frontend proxy paths for BYOK live token creation', async () => {
    const createLiveToken = vi.fn(async (apiKey: string, apiBaseUrl?: string) => ({
      name: `tokens/${apiKey}/${apiBaseUrl}`,
    }));
    const app = createServer(
      {
        geminiApiBase: 'https://generativelanguage.googleapis.com',
        geminiApiKey: '',
      },
      { createLiveToken },
    );

    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/live-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'browser-key',
        apiBaseUrl: '/api/gemini',
      }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ name: 'tokens/browser-key/undefined' });
    expect(createLiveToken).toHaveBeenCalledWith('browser-key');
  });

  it('rejects BYOK live token requests without a valid posted API key or server key', async () => {
    const createLiveToken = vi.fn(async (apiKey: string) => ({ name: `tokens/${apiKey}` }));
    const app = createServer(
      {
        geminiApiBase: 'https://generativelanguage.googleapis.com',
        geminiApiKey: '',
      },
      { createLiveToken },
    );

    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/live-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: '   ' }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'API key is required to create a Live API token.' });
    expect(createLiveToken).not.toHaveBeenCalled();
  });

  it('proxies /api/gemini/* preserving method/path/query/body and streaming response', async () => {
    const upstreamRequests: Array<{
      method: string;
      url: string;
      body: string;
      headers: http.IncomingHttpHeaders;
    }> = [];

    const upstream = http.createServer((request, response) => {
      const bodyChunks: Buffer[] = [];
      request.on('data', (chunk) => bodyChunks.push(Buffer.from(chunk)));
      request.on('end', () => {
        upstreamRequests.push({
          method: request.method ?? '',
          url: request.url ?? '',
          body: Buffer.concat(bodyChunks).toString('utf8'),
          headers: request.headers,
        });

        response.writeHead(201, {
          'content-type': 'text/event-stream',
          'x-upstream': 'yes',
        });
        response.write('chunk-1\n');
        setTimeout(() => {
          response.write('chunk-2\n');
          response.end();
        }, 25);
      });
    });

    const upstreamStarted = await startHttpServer(upstream);
    cleanupCallbacks.push(upstreamStarted.close);

    const app = createServer({
      geminiApiBase: upstreamStarted.baseUrl,
      geminiApiKey: 'server-key',
    });
    const appStarted = await startHttpServer(app);
    cleanupCallbacks.push(appStarted.close);

    const proxyResponse = await fetch(
      `${appStarted.baseUrl}/api/gemini/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-header': 'present',
        },
        body: JSON.stringify({ prompt: 'hello' }),
      },
    );

    const proxyBody = await proxyResponse.text();

    expect(proxyResponse.status).toBe(201);
    expect(proxyResponse.headers.get('content-type')).toContain('text/event-stream');
    expect(proxyResponse.headers.get('x-upstream')).toBe('yes');
    expect(proxyBody).toContain('chunk-1');
    expect(proxyBody).toContain('chunk-2');

    expect(upstreamRequests).toHaveLength(1);
    expect(upstreamRequests[0].method).toBe('POST');
    expect(upstreamRequests[0].url).toBe('/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse');
    expect(upstreamRequests[0].body).toBe(JSON.stringify({ prompt: 'hello' }));
    expect(upstreamRequests[0].headers['x-goog-api-key']).toBe('server-key');
    expect(upstreamRequests[0].headers['x-client-header']).toBe('present');
  });

  it('filters hop-by-hop and sensitive request headers before proxying', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response('proxied', { status: 202 });
    });
    const app = createServer(
      {
        geminiApiBase: 'https://example.test',
        geminiApiKey: 'server-key',
      },
      { fetchImpl },
    );
    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await new Promise<{ statusCode: number }>((resolve, reject) => {
      const request = http.request(`${started.baseUrl}/api/gemini/v1beta/models`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          connection: 'keep-alive',
          te: 'trailers',
          authorization: 'Bearer user-token',
          cookie: 'session=abc',
          'accept-encoding': 'gzip',
          'x-client-header': 'present',
        },
      });

      request.on('response', (proxyResponse) => {
        proxyResponse.resume();
        proxyResponse.on('end', () => {
          resolve({ statusCode: proxyResponse.statusCode ?? 0 });
        });
      });
      request.on('error', reject);
      request.end(JSON.stringify({ prompt: 'hello' }));
    });

    expect(response.statusCode).toBe(202);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const firstCall = fetchImpl.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error('Expected fetchImpl to be called once');
    }

    const init = firstCall[1];
    expect(init).toBeDefined();
    if (!init) {
      throw new Error('Expected fetchImpl to receive RequestInit');
    }

    const headers = init.headers;
    expect(headers).toBeInstanceOf(Headers);
    if (!(headers instanceof Headers)) {
      throw new Error('Expected proxy request headers to be a Headers instance');
    }

    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-client-header')).toBe('present');
    expect(headers.get('x-goog-api-key')).toBe('server-key');
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('te')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('accept-encoding')).toBeNull();
  });

  it('uses the browser-provided Gemini API key for proxy requests when no server key is configured', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response('proxied', { status: 202 });
    });
    const app = createServer(
      {
        geminiApiBase: 'https://example.test',
        geminiApiKey: '',
      },
      { fetchImpl },
    );
    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/gemini/v1beta/models`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': 'browser-key',
      },
      body: JSON.stringify({ prompt: 'hello' }),
    });

    expect(response.status).toBe(202);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const init = fetchImpl.mock.calls[0][1];
    if (!init?.headers || !(init.headers instanceof Headers)) {
      throw new Error('Expected proxy request headers to be a Headers instance');
    }

    expect(init.headers.get('x-goog-api-key')).toBe('browser-key');
  });

  it('returns a 502 JSON error when Gemini upstream fetch fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const app = createServer(
      {
        geminiApiBase: 'https://example.test',
        geminiApiKey: 'server-key',
      },
      { fetchImpl },
    );
    const started = await startHttpServer(app);
    cleanupCallbacks.push(started.close);

    const response = await fetch(`${started.baseUrl}/api/gemini/v1beta/models`);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: 'Gemini upstream request failed: network down',
    });
  });
});
