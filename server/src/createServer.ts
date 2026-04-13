import http, { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { GoogleGenAI } from '@google/genai';
import type { ApiServerConfig } from './config.js';

const GEMINI_PROXY_PREFIX = '/api/gemini';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const STRIPPED_PROXY_REQUEST_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'accept-encoding',
  'authorization',
  'content-length',
  'cookie',
  'host',
]);
const STRIPPED_PROXY_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'content-encoding',
  'content-length',
]);

export interface LiveTokenPayload {
  name?: string;
  token?: string;
}

export interface CreateServerDependencies {
  fetchImpl?: typeof fetch;
  createLiveToken?: (apiKey: string) => Promise<LiveTokenPayload>;
}

type CreateServerConfig = Pick<ApiServerConfig, 'geminiApiBase' | 'geminiApiKey'> &
  Partial<Pick<ApiServerConfig, 'allowedOrigins'>>;

interface ResolvedServerConfig extends CreateServerConfig {
  allowedOrigins: string[];
}

export async function createLiveTokenWithGemini(apiKey: string): Promise<LiveTokenPayload> {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });

  return client.authTokens.create({ config: { uses: 1 } });
}

function getCorsHeaders(request: IncomingMessage, allowedOrigins: string[]): Record<string, string> {
  if (!allowedOrigins.length) {
    return {};
  }

  const origin = request.headers.origin;
  if (!origin) {
    return {};
  }

  const allowAll = allowedOrigins.includes('*');
  const isAllowed = allowAll || allowedOrigins.includes(origin);
  if (!isAllowed) {
    return {};
  }

  return {
    'access-control-allow-origin': allowAll ? '*' : origin,
    vary: 'Origin',
  };
}

function sendJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
  allowedOrigins: string[],
): void {
  if (response.headersSent || response.destroyed) {
    response.destroy();
    return;
  }

  const corsHeaders = getCorsHeaders(request, allowedOrigins);
  response.writeHead(statusCode, {
    ...corsHeaders,
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function getConnectionManagedHeaders(value: string | null | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(',')
      .map((headerName) => headerName.trim().toLowerCase())
      .filter((headerName) => headerName.length > 0),
  );
}

function buildProxyHeaders(request: IncomingMessage, apiKey: string): Headers {
  const headers = new Headers();
  const connectionManagedHeaders = getConnectionManagedHeaders(
    Array.isArray(request.headers.connection) ? request.headers.connection.join(',') : request.headers.connection,
  );

  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'undefined') {
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (
      STRIPPED_PROXY_REQUEST_HEADERS.has(normalizedName) ||
      connectionManagedHeaders.has(normalizedName)
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(normalizedName, value.join(','));
      continue;
    }

    headers.set(normalizedName, value);
  }

  headers.set('x-goog-api-key', apiKey);
  return headers;
}

function buildProxyResponseHeaders(
  request: IncomingMessage,
  upstreamResponse: Response,
  allowedOrigins: string[],
): Record<string, string> {
  const responseHeaders: Record<string, string> = {};
  const connectionManagedHeaders = getConnectionManagedHeaders(upstreamResponse.headers.get('connection'));

  upstreamResponse.headers.forEach((value, key) => {
    const normalizedName = key.toLowerCase();
    if (
      STRIPPED_PROXY_RESPONSE_HEADERS.has(normalizedName) ||
      connectionManagedHeaders.has(normalizedName)
    ) {
      return;
    }

    responseHeaders[normalizedName] = value;
  });

  Object.assign(responseHeaders, getCorsHeaders(request, allowedOrigins));
  return responseHeaders;
}

async function proxyGeminiRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: ResolvedServerConfig,
  fetchImpl: typeof fetch,
): Promise<void> {
  if (!config.geminiApiKey) {
    sendJson(request, response, 500, { error: 'GEMINI_API_KEY is not configured.' }, config.allowedOrigins);
    return;
  }

  const requestUrl = new URL(request.url || '/', 'http://localhost');
  const upstreamPath = requestUrl.pathname.slice(GEMINI_PROXY_PREFIX.length) || '/';
  const targetBase = config.geminiApiBase.replace(/\/$/, '');
  const upstreamUrl = `${targetBase}${upstreamPath}${requestUrl.search}`;
  const method = request.method || 'GET';
  const hasBody = !['GET', 'HEAD'].includes(method);
  const abortController = new AbortController();
  const abortUpstream = () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  };

  const requestInit: RequestInit & { duplex?: 'half' } = {
    method,
    headers: buildProxyHeaders(request, config.geminiApiKey),
    signal: abortController.signal,
  };

  if (hasBody) {
    requestInit.body = request as unknown as BodyInit;
    requestInit.duplex = 'half';
  }

  request.once('aborted', abortUpstream);
  response.once('close', abortUpstream);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchImpl(upstreamUrl, requestInit);
  } catch (error) {
    request.off('aborted', abortUpstream);
    response.off('close', abortUpstream);
    if (abortController.signal.aborted) {
      if (!response.destroyed) {
        response.destroy();
      }
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    sendJson(request, response, 502, { error: `Gemini upstream request failed: ${message}` }, config.allowedOrigins);
    return;
  }

  response.writeHead(
    upstreamResponse.status,
    buildProxyResponseHeaders(request, upstreamResponse, config.allowedOrigins),
  );

  if (!upstreamResponse.body) {
    request.off('aborted', abortUpstream);
    response.off('close', abortUpstream);
    response.end();
    return;
  }

  try {
    await pipeline(Readable.fromWeb(upstreamResponse.body as unknown as NodeReadableStream), response);
  } catch (error) {
    if (!abortController.signal.aborted && !response.destroyed) {
      response.destroy(error instanceof Error ? error : undefined);
    }
  } finally {
    request.off('aborted', abortUpstream);
    response.off('close', abortUpstream);
  }
}

export function createServer(
  config: CreateServerConfig,
  dependencies: CreateServerDependencies = {},
): http.Server {
  const resolvedConfig: ResolvedServerConfig = {
    ...config,
    allowedOrigins: config.allowedOrigins ?? [],
  };

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const createLiveToken = dependencies.createLiveToken ?? createLiveTokenWithGemini;

  return http.createServer(async (request, response) => {
    try {
      const corsHeaders = getCorsHeaders(request, resolvedConfig.allowedOrigins);
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      const path = requestUrl.pathname;
      const method = request.method || 'GET';

      if (method === 'OPTIONS') {
        response.writeHead(204, {
          ...corsHeaders,
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers':
            (request.headers['access-control-request-headers'] as string | undefined) || '*',
        });
        response.end();
        return;
      }

      if (method === 'GET' && path === '/health') {
        sendJson(
          request,
          response,
          200,
          {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
          },
          resolvedConfig.allowedOrigins,
        );
        return;
      }

      if (method === 'GET' && path === '/api/live-token') {
        if (!resolvedConfig.geminiApiKey) {
          sendJson(
            request,
            response,
            500,
            { error: 'GEMINI_API_KEY is not configured.' },
            resolvedConfig.allowedOrigins,
          );
          return;
        }

        try {
          const tokenPayload = await createLiveToken(resolvedConfig.geminiApiKey);
          if (typeof tokenPayload.name === 'string' && tokenPayload.name.length > 0) {
            sendJson(request, response, 200, { name: tokenPayload.name }, resolvedConfig.allowedOrigins);
            return;
          }

          if (typeof tokenPayload.token === 'string' && tokenPayload.token.length > 0) {
            sendJson(request, response, 200, { token: tokenPayload.token }, resolvedConfig.allowedOrigins);
            return;
          }

          sendJson(
            request,
            response,
            502,
            { error: 'Live token service returned an unexpected payload.' },
            resolvedConfig.allowedOrigins,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          sendJson(
            request,
            response,
            502,
            { error: `Failed to create live token: ${message}` },
            resolvedConfig.allowedOrigins,
          );
        }
        return;
      }

      if (path === GEMINI_PROXY_PREFIX || path.startsWith(`${GEMINI_PROXY_PREFIX}/`)) {
        await proxyGeminiRequest(request, response, resolvedConfig, fetchImpl);
        return;
      }

      sendJson(request, response, 404, { error: 'Not found' }, resolvedConfig.allowedOrigins);
    } catch {
      sendJson(request, response, 500, { error: 'Internal server error' }, resolvedConfig.allowedOrigins);
    }
  });
}
