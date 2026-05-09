import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import net from 'node:net';
import { Buffer } from 'node:buffer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';

const MERMAID_DIST_IMPORTER_PATTERN = /node_modules[\\/]mermaid[\\/]dist[\\/]/;
const MERMAID_DISABLED_MODULE_PREFIX = '\0disabled-mermaid-diagram:';
const DISABLED_MERMAID_DIAGRAMS = [
  {
    id: 'flowchart-elk',
    pattern: /^\.\/flowchart-elk-definition-[^/]+\.js$/,
    message:
      'Mermaid flowchart-elk support is disabled in this build to reduce bundle size. Use standard flowchart/graph diagrams instead.',
  },
  {
    id: 'mindmap',
    pattern: /^\.\/mindmap-definition-[^/]+\.js$/,
    message: 'Mermaid mindmap support is disabled in this build to reduce bundle size.',
  },
] as const;

const isPackagePath = (id: string, packages: string[]) => {
  return packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`));
};

const MARKDOWN_PACKAGES = [
  'react-markdown',
  'remark-gfm',
  'remark-breaks',
  'rehype-raw',
  'rehype-sanitize',
  'unified',
  'remark-parse',
  'remark-rehype',
  'unist-util-visit',
  'unist-util-visit-parents',
  'unist-util-is',
  'micromark',
  'mdast-util-from-markdown',
  'mdast-util-to-hast',
  'mdast-util-to-string',
  'hast-util-to-html',
  'hast-util-from-html-isomorphic',
  'hast-util-to-text',
  'property-information',
  'vfile',
];

const MATH_PACKAGES = ['remark-math', 'rehype-katex', 'katex'];

const HIGHLIGHT_PACKAGES = ['rehype-highlight', 'highlight.js', 'lowlight'];

const REACT_PACKAGES = ['react', 'react-dom', 'scheduler'];

const PDF_VIEWER_PACKAGES = ['react-pdf'];

const PDFJS_PACKAGES = ['pdfjs-dist'];

const GRAPHVIZ_PACKAGES = ['@viz-js/viz'];

const DATA_PACKAGES = ['xlsx'];

// Keep the served worker pinned to the same pdfjs-dist version bundled under react-pdf.
const PDF_WORKER_COPY_SOURCE = 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs';
const LAMEJS_WORKER_COPY_SOURCE = 'node_modules/lamejs/lame.min.js';
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

const HEAVY_PRELOAD_PATTERNS = [
  /^assets\/pyodide-runtime-.*\.js$/,
  /^assets\/pyodideService-.*\.js$/,
  /^assets\/pdfjs-vendor-.*\.js$/,
  /^assets\/pdf-viewer-vendor-.*\.(?:js|css)$/,
  /^assets\/markdown-vendor-.*\.js$/,
  /^assets\/math-vendor-.*\.(?:js|css)$/,
  /^assets\/highlight-vendor-.*\.js$/,
  /^assets\/genai-vendor-.*\.js$/,
  /^assets\/graphviz-vendor-.*\.js$/,
  /^assets\/html2canvas\.esm-.*\.js$/,
  /^assets\/data-vendor-.*\.js$/,
];

const isSourcePath = (id: string, sourcePath: string) =>
  id.endsWith(sourcePath) || id.includes(sourcePath.replace(/\//g, '\\'));

export const getManualChunk = (id: string) => {
  if (isSourcePath(id, '/src/constants/settingsModelOptions.ts')) {
    return 'settings-options';
  }

  if (!id.includes('node_modules')) return undefined;

  if (isPackagePath(id, REACT_PACKAGES)) {
    return 'react-vendor';
  }

  if (isPackagePath(id, ['@google/genai'])) {
    return 'genai-vendor';
  }

  if (isPackagePath(id, HIGHLIGHT_PACKAGES)) {
    return 'highlight-vendor';
  }

  if (isPackagePath(id, MATH_PACKAGES)) {
    return 'math-vendor';
  }

  if (isPackagePath(id, MARKDOWN_PACKAGES)) {
    return 'markdown-vendor';
  }

  if (isPackagePath(id, ['lucide-react'])) {
    return 'icons-vendor';
  }

  if (isPackagePath(id, ['zustand'])) {
    return 'state-vendor';
  }

  if (isPackagePath(id, GRAPHVIZ_PACKAGES)) {
    return 'graphviz-vendor';
  }

  if (isPackagePath(id, ['@formkit/auto-animate'])) {
    return 'ui-vendor';
  }

  if (isPackagePath(id, ['react-virtuoso'])) {
    return 'ui-vendor';
  }

  if (isPackagePath(id, PDFJS_PACKAGES)) {
    return 'pdfjs-vendor';
  }

  if (isPackagePath(id, PDF_VIEWER_PACKAGES)) {
    return 'pdf-viewer-vendor';
  }

  if (isPackagePath(id, DATA_PACKAGES)) {
    return 'data-vendor';
  }

  return undefined;
};

const createDisabledMermaidDiagramPlugin = () => {
  return {
    name: 'disabled-mermaid-diagrams',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !MERMAID_DIST_IMPORTER_PATTERN.test(importer)) return null;

      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ pattern }) => pattern.test(source));
      if (!disabledDiagram) return null;

      return `${MERMAID_DISABLED_MODULE_PREFIX}${disabledDiagram.id}`;
    },
    load(id: string) {
      if (!id.startsWith(MERMAID_DISABLED_MODULE_PREFIX)) return null;

      const diagramId = id.slice(MERMAID_DISABLED_MODULE_PREFIX.length);
      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ id: disabledId }) => disabledId === diagramId);
      if (!disabledDiagram) return null;

      return `
const message = ${JSON.stringify(disabledDiagram.message)};

export const diagram = {
  db: {
    clear() {},
  },
  renderer: {
    draw() {
      throw new Error(message);
    },
  },
  parser: {
    parser: { yy: {} },
    parse() {
      throw new Error(message);
    },
  },
  styles: () => '',
  init: () => undefined,
};
`;
    },
  };
};

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

const execFileAsync = promisify(execFile);

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

const proxyImageRequest = async (
  request: { method?: string; url?: string },
  response: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    end: (body?: string | Uint8Array) => void;
  },
) => {
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

const localClipboardImageRequest = async (
  request: { method?: string },
  response: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    end: (body?: string | Uint8Array) => void;
  },
) => {
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

const createLocalApiPlugin = (): Plugin => ({
  name: 'amc-local-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
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
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
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
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5175,
      strictPort: true,
    },
    plugins: [
      createDisabledMermaidDiagramPlugin(),
      createLocalApiPlugin(),
      tailwindcss(),
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        injectRegister: false,
        manifest: false,
        includeAssets: ['pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png'],
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,png,svg,mjs,json,woff,woff2,ttf}'],
          globIgnores: [
            '**/runtime-config.js',
            '**/pyodide/**',
            '**/assets/pyodide-runtime-*.js',
            '**/assets/pdfjs-vendor-*.js',
            '**/assets/graphviz-vendor-*.js',
            '**/assets/html2canvas.esm-*.js',
            '**/assets/data-vendor-*.js',
            '**/fonts/NotoSansCJKsc-VF.ttf.part-*',
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pyodide/*',
            dest: 'pyodide',
          },
          {
            src: PDF_WORKER_COPY_SOURCE,
            dest: '.',
          },
          {
            src: LAMEJS_WORKER_COPY_SOURCE,
            dest: '.',
          },
        ],
      }),
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        // __dirname is not available in ES modules.
        // We'll resolve from the current working directory.
        '@': path.resolve('./src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      modulePreload: {
        resolveDependencies: (_filename, deps) => {
          return deps.filter((dep) => !HEAVY_PRELOAD_PATTERNS.some((pattern) => pattern.test(dep)));
        },
      },
      rollupOptions: {
        output: {
          manualChunks: getManualChunk,
        },
      },
    },
  };
});
