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
    expect(body).toEqual({ name: 'tokens/server-key' });
    expect(createLiveToken).toHaveBeenCalledWith('server-key');
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
});
