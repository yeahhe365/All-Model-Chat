import { Buffer } from 'node:buffer';
import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const IMAGE_PROXY_PATH = '/api/image-proxy';
const LOCAL_CLIPBOARD_IMAGE_PATH = '/api/local-clipboard-image';
const MAX_IMAGE_PROXY_BYTES = 25 * 1024 * 1024;
const MAX_LOCAL_CLIPBOARD_IMAGE_BYTES = 25 * 1024 * 1024;
const PNG_HEX_PREFIX = '89504e470d0a1a0a';
const MACOS_CLIPBOARD_PNG_SCRIPT = `
(() => {
  ObjC.import('AppKit');
  ObjC.import('Foundation');
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const data = pasteboard.dataForType($('public.png'));
  if (!data || data.isNil()) {
    return '';
  }
  return ObjC.unwrap(data.base64EncodedStringWithOptions(0));
})()
`.trim();

type DevServerRequest = { method?: string; url?: string };
type DevServerResponse = {
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body?: string | Uint8Array) => void;
};

const execFileAsync = promisify(execFile);

const isPrivateImageProxyHostname = (hostname: string): boolean => {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
  const ipVersion = net.isIP(normalizedHostname);

  if (ipVersion === 4) {
    const [first, second] = normalizedHostname.split('.').map((part) => Number(part));
    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254) ||
      first === 0
    );
  }

  if (ipVersion === 6) {
    const lower = normalizedHostname.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }

  return ['localhost', 'localhost.localdomain'].includes(normalizedHostname.toLowerCase());
};

const parseAllowedImageProxyUrl = (value: string | null): URL | null => {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }
    if (parsedUrl.username || parsedUrl.password || isPrivateImageProxyHostname(parsedUrl.hostname)) {
      return null;
    }
    return parsedUrl;
  } catch {
    return null;
  }
};

const parsePngBase64Data = (value: string): Buffer | null => {
  const base64 = value.trim();
  if (!base64) {
    return null;
  }

  const data = Buffer.from(base64, 'base64');
  if (!data.byteLength || !data.toString('hex', 0, 8).startsWith(PNG_HEX_PREFIX)) {
    return null;
  }

  return data;
};

const readMacOsClipboardPng = async (): Promise<Buffer | null> => {
  if (process.platform !== 'darwin') {
    return null;
  }

  try {
    const result = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', MACOS_CLIPBOARD_PNG_SCRIPT], {
      encoding: 'utf8',
      maxBuffer: MAX_LOCAL_CLIPBOARD_IMAGE_BYTES * 2 + 1024,
    });
    const data = parsePngBase64Data(result.stdout);
    if (!data || data.byteLength > MAX_LOCAL_CLIPBOARD_IMAGE_BYTES) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

const writeImageProxyJson = (
  response: { writeHead: (status: number, headers: Record<string, string>) => void; end: (body?: string) => void },
  statusCode: number,
  body: Record<string, unknown>,
) => {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const proxyImageRequest = async (request: DevServerRequest, response: DevServerResponse) => {
  const method = request.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    writeImageProxyJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const requestUrl = new URL(request.url || '/', 'http://localhost');
  const targetUrl = parseAllowedImageProxyUrl(requestUrl.searchParams.get('url'));
  if (!targetUrl) {
    writeImageProxyJson(response, 400, { error: 'Image proxy URL is not allowed.' });
    return;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'AMC-WebUI image proxy',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    writeImageProxyJson(response, 502, { error: `Image proxy request failed: ${message}` });
    return;
  }

  if (!upstreamResponse.ok) {
    writeImageProxyJson(response, 502, { error: `Image proxy target returned ${upstreamResponse.status}.` });
    return;
  }

  const contentType = upstreamResponse.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (!contentType.startsWith('image/')) {
    writeImageProxyJson(response, 415, { error: 'Image proxy target did not return an image.' });
    return;
  }

  const contentLength = Number(upstreamResponse.headers.get('content-length') ?? '0');
  if (contentLength > MAX_IMAGE_PROXY_BYTES) {
    writeImageProxyJson(response, 413, { error: 'Image proxy target is too large.' });
    return;
  }

  const body = new Uint8Array(await upstreamResponse.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_PROXY_BYTES) {
    writeImageProxyJson(response, 413, { error: 'Image proxy target is too large.' });
    return;
  }

  response.writeHead(upstreamResponse.status, {
    'content-type': contentType,
    'cache-control': 'public, max-age=86400',
    'x-content-type-options': 'nosniff',
  });
  response.end(method === 'HEAD' ? undefined : body);
};

const localClipboardImageRequest = async (request: { method?: string }, response: DevServerResponse) => {
  const method = request.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    writeImageProxyJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const data = await readMacOsClipboardPng();
  if (!data) {
    writeImageProxyJson(response, 404, { error: 'No local clipboard image is available.' });
    return;
  }

  response.writeHead(200, {
    'content-type': 'image/png',
    'content-length': String(data.byteLength),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-clipboard-file-name': 'clipboard-image.png',
  });
  response.end(method === 'HEAD' ? undefined : data);
};

const handleLocalApiRequest = (request: DevServerRequest, response: DevServerResponse, next: () => void) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost');

  if (requestUrl.pathname === IMAGE_PROXY_PATH) {
    void proxyImageRequest(request, response).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown image proxy error';
      writeImageProxyJson(response, 500, { error: message });
    });
    return;
  }

  if (requestUrl.pathname === LOCAL_CLIPBOARD_IMAGE_PATH) {
    void localClipboardImageRequest(request, response).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown local clipboard image error';
      writeImageProxyJson(response, 500, { error: message });
    });
    return;
  }

  next();
};

export const createLocalApiPlugin = (): Plugin => ({
  name: 'amc-local-api',
  configureServer(server) {
    server.middlewares.use(handleLocalApiRequest);
  },
  configurePreviewServer(server) {
    server.middlewares.use(handleLocalApiRequest);
  },
});
