# Docker Compose + Cloudflare Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Docker Compose deployment path with a standalone API service while keeping the frontend deployable as static assets on Cloudflare Pages.

**Architecture:** Keep the React/Vite app as a static frontend, add runtime-config-driven defaults for proxy and Live token endpoints, and introduce a narrow Node API service that proxies Gemini HTTP traffic and issues Live API ephemeral tokens. Preserve the existing manual API settings path by making the new deployment mode an opt-in default rather than a rewrite of the app's request layer.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Vitest, Node.js HTTP server, Docker Compose, Nginx.

---

## File Map

### Frontend runtime config and defaults

- Create: `public/runtime-config.js`
- Create: `src/runtime/runtimeConfig.ts`
- Create: `src/runtime/runtimeConfig.test.ts`
- Modify: `index.html`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/types/settings.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`

### Server-managed API selection and settings UI

- Create: `src/utils/__tests__/apiUtils.test.ts`
- Create: `src/components/settings/sections/ApiConfigSection.test.tsx`
- Modify: `src/utils/apiUtils.ts`
- Modify: `src/components/settings/sections/ApiConfigSection.tsx`
- Modify: `src/components/settings/SettingsContent.tsx`

### Backend API service

- Create: `server/tsconfig.json`
- Create: `server/src/config.ts`
- Create: `server/src/createServer.ts`
- Create: `server/src/index.ts`
- Create: `server/src/createServer.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

### Docker and deployment assets

- Create: `Dockerfile.web`
- Create: `Dockerfile.api`
- Create: `docker/nginx.conf`
- Create: `docker/web-entrypoint.sh`
- Create: `.env.example`
- Create: `docker-compose.yml`

### Documentation

- Modify: `README.md`

### Verification

- Reuse targeted tests above
- Run: `npm test -- src/runtime/runtimeConfig.test.ts src/utils/__tests__/apiUtils.test.ts src/components/settings/sections/ApiConfigSection.test.tsx server/src/createServer.test.ts`
- Run: `npm run typecheck`
- Run: `npm run build`
- Run: `npm run build:api`
- Run: `docker compose config`

### Task 1: Add Runtime Config Backed Frontend Defaults

**Files:**
- Create: `public/runtime-config.js`
- Create: `src/runtime/runtimeConfig.ts`
- Create: `src/runtime/runtimeConfig.test.ts`
- Modify: `index.html`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/types/settings.ts`
- Modify: `src/stores/settingsStore.ts`
- Test: `src/runtime/runtimeConfig.test.ts`
- Test: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: Write the failing runtime-config tests**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { getRuntimeConfig, getRuntimeAppSettingOverrides } from './runtimeConfig';

describe('runtimeConfig', () => {
  afterEach(() => {
    delete (window as Window & { __AMC_RUNTIME_CONFIG__?: unknown }).__AMC_RUNTIME_CONFIG__;
  });

  it('reads server-managed defaults from window runtime config', () => {
    (window as Window & { __AMC_RUNTIME_CONFIG__?: unknown }).__AMC_RUNTIME_CONFIG__ = {
      serverManagedApi: true,
      defaultUseCustomApiConfig: true,
      defaultUseApiProxy: true,
      defaultApiProxyUrl: '/api/gemini',
      defaultLiveApiEphemeralTokenEndpoint: '/api/live-token',
    };

    expect(getRuntimeConfig()).toMatchObject({
      serverManagedApi: true,
      defaultApiProxyUrl: '/api/gemini',
      defaultLiveApiEphemeralTokenEndpoint: '/api/live-token',
    });
    expect(getRuntimeAppSettingOverrides()).toMatchObject({
      serverManagedApi: true,
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: '/api/gemini',
      liveApiEphemeralTokenEndpoint: '/api/live-token',
    });
  });
});
```

```ts
it('keeps runtime defaults when no settings are stored yet', async () => {
  delete (window as Window & { __AMC_RUNTIME_CONFIG__?: unknown }).__AMC_RUNTIME_CONFIG__;
  (window as Window & { __AMC_RUNTIME_CONFIG__?: unknown }).__AMC_RUNTIME_CONFIG__ = {
    serverManagedApi: true,
    defaultUseCustomApiConfig: true,
    defaultUseApiProxy: true,
    defaultApiProxyUrl: '/api/gemini',
  };

  vi.mocked(dbService.getAppSettings).mockResolvedValue(undefined);
  await useSettingsStore.getState().loadSettings();

  expect(useSettingsStore.getState().appSettings.serverManagedApi).toBe(true);
  expect(useSettingsStore.getState().appSettings.apiProxyUrl).toBe('/api/gemini');
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/runtime/runtimeConfig.test.ts src/stores/__tests__/settingsStore.test.ts`
Expected: FAIL because the runtime-config module and the new `serverManagedApi` defaults do not exist yet.

- [ ] **Step 3: Implement the runtime-config layer and default merge**

```html
<!-- index.html -->
<body class="antialiased">
  <div id="root"></div>
  <script src="/runtime-config.js"></script>
  <script type="module" src="/src/index.tsx"></script>
</body>
```

```js
// public/runtime-config.js
window.__AMC_RUNTIME_CONFIG__ = {
  serverManagedApi: false,
  defaultUseCustomApiConfig: false,
  defaultUseApiProxy: false,
  defaultApiProxyUrl: '',
  defaultLiveApiEphemeralTokenEndpoint: '',
};
```

```ts
// src/runtime/runtimeConfig.ts
import type { AppSettings } from '../types';

export interface AllModelChatRuntimeConfig {
  serverManagedApi?: boolean;
  defaultUseCustomApiConfig?: boolean;
  defaultUseApiProxy?: boolean;
  defaultApiProxyUrl?: string;
  defaultLiveApiEphemeralTokenEndpoint?: string;
}

declare global {
  interface Window {
    __AMC_RUNTIME_CONFIG__?: AllModelChatRuntimeConfig;
  }
}

export const getRuntimeConfig = (): AllModelChatRuntimeConfig => {
  if (typeof window === 'undefined') return {};
  return window.__AMC_RUNTIME_CONFIG__ ?? {};
};

export const getRuntimeAppSettingOverrides = (): Partial<AppSettings> => {
  const runtime = getRuntimeConfig();

  return {
    serverManagedApi: runtime.serverManagedApi ?? false,
    useCustomApiConfig: runtime.defaultUseCustomApiConfig ?? false,
    useApiProxy: runtime.defaultUseApiProxy ?? false,
    apiProxyUrl: runtime.defaultApiProxyUrl?.trim() || '',
    liveApiEphemeralTokenEndpoint:
      runtime.defaultLiveApiEphemeralTokenEndpoint?.trim() || null,
  };
};
```

```ts
// src/constants/appConstants.ts
import { getRuntimeAppSettingOverrides } from '../runtime/runtimeConfig';

const runtimeDefaultOverrides = getRuntimeAppSettingOverrides();

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: 'pearl',
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false,
  apiKey: null,
  apiProxyUrl: 'https://api-proxy.de/gemini/v1beta',
  useApiProxy: false,
  liveApiEphemeralTokenEndpoint: null,
  serverManagedApi: false,
  language: 'system',
  isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
  transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
  filesApiConfig: DEFAULT_FILES_API_CONFIG,
  expandCodeBlocksByDefault: false,
  isAutoTitleEnabled: true,
  isMermaidRenderingEnabled: true,
  isGraphvizRenderingEnabled: true,
  isCompletionNotificationEnabled: false,
  isCompletionSoundEnabled: false,
  isSuggestionsEnabled: true,
  isAutoScrollOnSendEnabled: true,
  isAutoSendOnSuggestionClick: true,
  generateQuadImages: false,
  autoFullscreenHtml: true,
  showWelcomeSuggestions: true,
  isAudioCompressionEnabled: DEFAULT_IS_AUDIO_COMPRESSION_ENABLED,
  autoCanvasVisualization: false,
  autoCanvasModelId: DEFAULT_AUTO_CANVAS_MODEL_ID,
  isPasteRichTextAsMarkdownEnabled: true,
  isPasteAsTextFileEnabled: true,
  isSystemAudioRecordingEnabled: false,
  customShortcuts: {},
  ...runtimeDefaultOverrides,
};
```

```ts
// src/stores/settingsStore.ts
const sanitizeAppSettings = (settings: AppSettings): AppSettings => {
  const runtimeDefaults = getRuntimeAppSettingOverrides();

  return {
    ...runtimeDefaults,
    ...settings,
    modelId: resolveSupportedModelId(settings.modelId, DEFAULT_APP_SETTINGS.modelId),
    transcriptionModelId: resolveSupportedModelId(
      settings.transcriptionModelId,
      DEFAULT_APP_SETTINGS.transcriptionModelId,
    ),
  };
};
```

- [ ] **Step 4: Re-run the focused runtime-config tests**

Run: `npm test -- src/runtime/runtimeConfig.test.ts src/stores/__tests__/settingsStore.test.ts`
Expected: PASS

### Task 2: Allow Server-Managed Gemini Requests Without a Browser-Held Key

**Files:**
- Create: `src/utils/__tests__/apiUtils.test.ts`
- Create: `src/components/settings/sections/ApiConfigSection.test.tsx`
- Modify: `src/utils/apiUtils.ts`
- Modify: `src/components/settings/sections/ApiConfigSection.tsx`
- Modify: `src/components/settings/SettingsContent.tsx`
- Test: `src/utils/__tests__/apiUtils.test.ts`
- Test: `src/components/settings/sections/ApiConfigSection.test.tsx`

- [ ] **Step 1: Write the failing key-selection and settings tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { getKeyForRequest, SERVER_MANAGED_API_KEY } from '../apiUtils';

vi.mock('../../services/logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordApiKeyUsage: vi.fn() },
}));

it('returns the server-managed marker key when proxy mode is configured and no browser key exists', () => {
  const result = getKeyForRequest(
    {
      useCustomApiConfig: true,
      useApiProxy: true,
      apiProxyUrl: '/api/gemini',
      serverManagedApi: true,
      apiKey: null,
    } as any,
    { lockedApiKey: null } as any,
  );

  expect(result).toEqual({ key: SERVER_MANAGED_API_KEY, isNewKey: true });
});

it('keeps returning the existing configuration error when server-managed mode is off', () => {
  expect(
    getKeyForRequest(
      {
        useCustomApiConfig: true,
        useApiProxy: false,
        serverManagedApi: false,
        apiKey: null,
      } as any,
      { lockedApiKey: null } as any,
    )
  ).toEqual({ error: 'API Key not configured.' });
});
```

```tsx
it('tests the proxy path with the server-managed marker key when no local key is configured', async () => {
  const getClientMock = vi.fn().mockResolvedValue({
    models: { generateContent: vi.fn().mockResolvedValue({}) },
  });

  vi.mock('../../../services/api/baseApi', () => ({
    getClient: getClientMock,
  }));

  act(() => {
    root.render(
      <ApiConfigSection
        useCustomApiConfig
        setUseCustomApiConfig={vi.fn()}
        apiKey={null}
        setApiKey={vi.fn()}
        apiProxyUrl="/api/gemini"
        setApiProxyUrl={vi.fn()}
        useApiProxy
        setUseApiProxy={vi.fn()}
        liveApiEphemeralTokenEndpoint="/api/live-token"
        setLiveApiEphemeralTokenEndpoint={vi.fn()}
        serverManagedApi
        t={(key) => key}
      />
    );
  });

  await act(async () => {
    (document.querySelector('button') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await Promise.resolve();
  });

  expect(getClientMock).toHaveBeenCalledWith(SERVER_MANAGED_API_KEY, '/api/gemini');
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/utils/__tests__/apiUtils.test.ts src/components/settings/sections/ApiConfigSection.test.tsx`
Expected: FAIL because server-managed mode does not exist yet and the connection tester still hard-fails when no local key is present.

- [ ] **Step 3: Implement the server-managed branch in the request helpers and settings UI**

```ts
// src/utils/apiUtils.ts
export const SERVER_MANAGED_API_KEY = '__all_model_chat_server_managed__';

const isServerManagedApiEnabled = (appSettings: AppSettings) =>
  !!(
    appSettings.serverManagedApi &&
    appSettings.useCustomApiConfig &&
    appSettings.useApiProxy &&
    appSettings.apiProxyUrl
  );

export const getKeyForRequest = (
  appSettings: AppSettings,
  currentChatSettings: ChatSettings,
  options: { skipIncrement?: boolean } = {}
) => {
  const { apiKeysString } = getActiveApiConfig(appSettings);
  const configuredKeys = parseApiKeys(apiKeysString);
  const availableKeys =
    configuredKeys.length === 0 && isServerManagedApiEnabled(appSettings)
      ? [SERVER_MANAGED_API_KEY]
      : configuredKeys;

  if (availableKeys.length === 0) {
    return { error: 'API Key not configured.' };
  }

  if (availableKeys.length === 1) {
    const key = availableKeys[0];
    if (key !== SERVER_MANAGED_API_KEY) {
      logUsage(key);
    }

    return {
      key,
      isNewKey: currentChatSettings.lockedApiKey !== key,
    };
  }

  let lastUsedIndex = -1;
  try {
    const storedIndex = localStorage.getItem(API_KEY_LAST_USED_INDEX_KEY);
    if (storedIndex !== null) {
      lastUsedIndex = parseInt(storedIndex, 10);
    }
  } catch (error) {
    logService.error('Could not parse last used API key index', error);
  }

  if (isNaN(lastUsedIndex) || lastUsedIndex < 0 || lastUsedIndex >= availableKeys.length) {
    lastUsedIndex = -1;
  }

  const targetIndex =
    options.skipIncrement
      ? lastUsedIndex === -1 ? 0 : lastUsedIndex
      : (lastUsedIndex + 1) % availableKeys.length;

  if (!options.skipIncrement) {
    localStorage.setItem(API_KEY_LAST_USED_INDEX_KEY, targetIndex.toString());
  }

  const nextKey = availableKeys[targetIndex];
  if (nextKey !== SERVER_MANAGED_API_KEY) {
    logUsage(nextKey);
  }

  return { key: nextKey, isNewKey: true };
};
```

```tsx
// src/components/settings/sections/ApiConfigSection.tsx
import { SERVER_MANAGED_API_KEY } from '../../../utils/apiUtils';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  useApiProxy: boolean;
  setUseApiProxy: (value: boolean) => void;
  liveApiEphemeralTokenEndpoint: string | null;
  setLiveApiEphemeralTokenEndpoint: (value: string | null) => void;
  serverManagedApi: boolean;
  t: (key: string) => string;
}

if (useCustomApiConfig && !keyToTest && !serverManagedApi) {
  setTestStatus('error');
  setTestMessage('No API Key provided to test.');
  return;
}

if (serverManagedApi && !keyToTest) {
  keyToTest = SERVER_MANAGED_API_KEY;
}

<ApiConnectionTester
  onTest={handleTestConnection}
  testStatus={testStatus}
  testMessage={testMessage}
  isTestDisabled={testStatus === 'testing' || (!apiKey && useCustomApiConfig && !serverManagedApi)}
  availableModels={CONNECTION_TEST_MODELS}
  testModelId={testModelId}
  onModelChange={setTestModelId}
  t={t}
/>
```

```tsx
// src/components/settings/SettingsContent.tsx
<ApiConfigSection
  useCustomApiConfig={currentSettings.useCustomApiConfig}
  setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
  apiKey={currentSettings.apiKey}
  setApiKey={(val) => updateSetting('apiKey', val)}
  apiProxyUrl={currentSettings.apiProxyUrl}
  setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
  useApiProxy={currentSettings.useApiProxy ?? false}
  setUseApiProxy={(val) => updateSetting('useApiProxy', val)}
  liveApiEphemeralTokenEndpoint={currentSettings.liveApiEphemeralTokenEndpoint ?? null}
  setLiveApiEphemeralTokenEndpoint={(val) => updateSetting('liveApiEphemeralTokenEndpoint', val)}
  serverManagedApi={currentSettings.serverManagedApi ?? false}
  t={t as any}
/>
```

- [ ] **Step 4: Re-run the focused server-managed tests**

Run: `npm test -- src/utils/__tests__/apiUtils.test.ts src/components/settings/sections/ApiConfigSection.test.tsx`
Expected: PASS

### Task 3: Add the Standalone API Service for Health, Live Tokens, and Gemini Proxying

**Files:**
- Create: `server/tsconfig.json`
- Create: `server/src/config.ts`
- Create: `server/src/createServer.ts`
- Create: `server/src/index.ts`
- Create: `server/src/createServer.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Test: `server/src/createServer.test.ts`

- [ ] **Step 1: Write the failing Node-side API service tests**

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from './createServer';

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    authTokens: {
      create: vi.fn().mockResolvedValue({ name: 'ephemeral-token-name' }),
    },
  })),
}));

const startTestServer = async () => {
  const server = createServer({
    geminiApiKey: 'server-side-key',
    port: 0,
    geminiApiBase: 'https://generativelanguage.googleapis.com',
    allowedOrigins: ['https://pages.example.com'],
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Missing test port');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
};

describe('createServer', () => {
  it('returns health information from /health', async () => {
    const { server, baseUrl } = await startTestServer();
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns a live token from /api/live-token', async () => {
    const { server, baseUrl } = await startTestServer();
    const response = await fetch(`${baseUrl}/api/live-token`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: 'ephemeral-token-name' });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('proxies Gemini requests through /api/gemini/*', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const { server, baseUrl } = await startTestServer();
    const response = await fetch(
      `${baseUrl}/api/gemini/v1beta/models/gemini-3-flash-preview:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://pages.example.com',
        },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] }),
      }
    );

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      }),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'server-side-key',
        }),
      })
    );

    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run the API service tests to verify they fail**

Run: `npm test -- server/src/createServer.test.ts`
Expected: FAIL because the `server/` sources and Vitest include path do not exist yet.

- [ ] **Step 3: Implement the backend service and test support**

```json
// package.json
{
  "scripts": {
    "build:api": "tsc -p server/tsconfig.json",
    "start:api": "node server/dist/index.js"
  }
}
```

```ts
// server/src/config.ts
export interface ApiServerConfig {
  geminiApiKey: string;
  port: number;
  geminiApiBase: string;
  allowedOrigins: string[];
}

export const readApiServerConfig = (env: NodeJS.ProcessEnv): ApiServerConfig => ({
  geminiApiKey: env.GEMINI_API_KEY || '',
  port: Number(env.PORT || '3001'),
  geminiApiBase: env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com',
  allowedOrigins: (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
});
```

```ts
// server/src/createServer.ts
import http from 'node:http';
import { Readable } from 'node:stream';
import { GoogleGenAI } from '@google/genai';
import type { ApiServerConfig } from './config';

export const createServer = (config: ApiServerConfig) =>
  http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing request URL.' }));
      return;
    }

    const origin = req.headers.origin;
    const isAllowedOrigin = !!origin && config.allowedOrigins.includes(origin);

    if (isAllowedOrigin) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
      res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type,x-goog-api-key');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(isAllowedOrigin ? 204 : 403);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/live-token') {
      if (!config.geminiApiKey) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'GEMINI_API_KEY is required.' }));
        return;
      }

      const client = new GoogleGenAI({
        apiKey: config.geminiApiKey,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      const token = await client.authTokens.create({ config: { uses: 1 } });

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ name: token.name }));
      return;
    }

    if (req.url.startsWith('/api/gemini/')) {
      const upstreamUrl = new URL(req.url.replace(/^\/api\/gemini/, ''), config.geminiApiBase);
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          ...Object.fromEntries(Object.entries(req.headers).filter(([key]) => key !== 'host')),
          'x-goog-api-key': config.geminiApiKey,
        },
        body:
          req.method === 'GET' || req.method === 'HEAD'
            ? undefined
            : (Readable.toWeb(req) as BodyInit),
        duplex: 'half',
      });

      res.writeHead(upstreamResponse.status, Object.fromEntries(upstreamResponse.headers.entries()));
      if (upstreamResponse.body) {
        Readable.fromWeb(upstreamResponse.body).pipe(res);
        return;
      }

      res.end();
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found.' }));
  });
```

```ts
// server/src/index.ts
import { createServer } from './createServer';
import { readApiServerConfig } from './config';

const config = readApiServerConfig(process.env);
const server = createServer(config);

server.listen(config.port, () => {
  console.log(`[api] listening on ${config.port}`);
});
```

```json
// server/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"],
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": false
  },
  "include": ["src/**/*.ts"]
}
```

```ts
// vitest.config.ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/src/**/*.{test,spec}.{ts,tsx}'],
  css: true,
}
```

- [ ] **Step 4: Re-run the API service tests**

Run: `npm test -- server/src/createServer.test.ts`
Expected: PASS

### Task 4: Add Docker Images, Compose Wiring, and Runtime Config Injection

**Files:**
- Create: `Dockerfile.web`
- Create: `Dockerfile.api`
- Create: `docker/nginx.conf`
- Create: `docker/web-entrypoint.sh`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Modify: `public/runtime-config.js`

- [ ] **Step 1: Write the Docker config expectations as a lightweight checklist**

```md
- `web` serves the static app on port 8080
- `web` proxies `/api/*` to the `api` service
- `api` reads `GEMINI_API_KEY` from the compose environment
- `runtime-config.js` defaults to same-origin `/api/gemini` and `/api/live-token`
```

- [ ] **Step 2: Run `docker compose config` to verify it currently fails**

Run: `docker compose config`
Expected: FAIL because `docker-compose.yml` does not exist yet.

- [ ] **Step 3: Add the Docker and Nginx assets**

```dockerfile
# Dockerfile.web
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/web-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/runtime-config.js /usr/share/nginx/html/runtime-config.js
```

```dockerfile
# Dockerfile.api
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server ./server
COPY tsconfig.json ./
RUN npm run build:api

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/server/dist ./server/dist
CMD ["node", "server/dist/index.js"]
```

```nginx
# docker/nginx.conf
server {
  listen 8080;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://api:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

```sh
#!/bin/sh
# docker/web-entrypoint.sh
cat <<EOF >/usr/share/nginx/html/runtime-config.js
window.__AMC_RUNTIME_CONFIG__ = {
  serverManagedApi: ${AMC_SERVER_MANAGED_API:-true},
  defaultUseCustomApiConfig: ${AMC_DEFAULT_USE_CUSTOM_API_CONFIG:-true},
  defaultUseApiProxy: ${AMC_DEFAULT_USE_API_PROXY:-true},
  defaultApiProxyUrl: "${AMC_DEFAULT_API_PROXY_URL:-/api/gemini}",
  defaultLiveApiEphemeralTokenEndpoint: "${AMC_DEFAULT_LIVE_TOKEN_ENDPOINT:-/api/live-token}",
};
EOF
```

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    env_file:
      - .env
    environment:
      PORT: 3001
    expose:
      - "3001"

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    depends_on:
      - api
    ports:
      - "8080:8080"
```

```env
# .env.example
GEMINI_API_KEY=your_server_side_key
AMC_SERVER_MANAGED_API=true
AMC_DEFAULT_USE_CUSTOM_API_CONFIG=true
AMC_DEFAULT_USE_API_PROXY=true
AMC_DEFAULT_API_PROXY_URL=/api/gemini
AMC_DEFAULT_LIVE_TOKEN_ENDPOINT=/api/live-token
ALLOWED_ORIGINS=https://pages.example.com
```

- [ ] **Step 4: Re-run Docker config validation**

Run: `docker compose config`
Expected: PASS

### Task 5: Document the Dual Deployment Story and Verify the Whole Stack

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README deployment sections**

````md
## Docker Compose 部署

```bash
cp .env.example .env
# 填入 GEMINI_API_KEY
docker compose up --build
```

访问 `http://localhost:8080`。

## Cloudflare Pages 部署

- 前端继续使用 `npm run build`
- 将构建产物部署到 Cloudflare Pages
- 将 `runtime-config.js` 中的 `/api/gemini` 与 `/api/live-token` 指向独立部署的 API 服务
- 长期 `GEMINI_API_KEY` 仅保留在 API 服务环境变量中
````

- [ ] **Step 2: Run the targeted regression suite**

Run: `npm test -- src/runtime/runtimeConfig.test.ts src/utils/__tests__/apiUtils.test.ts src/components/settings/sections/ApiConfigSection.test.tsx server/src/createServer.test.ts`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run the frontend build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Run the API build**

Run: `npm run build:api`
Expected: PASS

- [ ] **Step 6: Smoke-check the compose file**

Run: `docker compose up --build`
Expected: the frontend is reachable on `http://localhost:8080`, `docker compose exec api wget -qO- http://127.0.0.1:3001/health` returns JSON, and the browser app defaults to `/api/gemini` plus `/api/live-token` without asking for a local key.

- [ ] **Step 7: Commit the deployment batch**

```bash
git add public/runtime-config.js index.html src/runtime src/utils/__tests__/apiUtils.test.ts src/utils/apiUtils.ts src/components/settings/sections/ApiConfigSection.tsx src/components/settings/sections/ApiConfigSection.test.tsx src/components/settings/SettingsContent.tsx src/constants/appConstants.ts src/types/settings.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts server package.json vitest.config.ts Dockerfile.web Dockerfile.api docker/nginx.conf docker/web-entrypoint.sh docker-compose.yml .env.example README.md
git commit -m "feat: add docker and pages deployment support"
```

## Self-Review

### Spec Coverage

- Runtime-configurable frontend defaults: Task 1
- Server-managed browser flow with no real frontend key: Task 2
- Live token endpoint and Gemini proxy backend: Task 3
- Docker Compose + Nginx reverse proxy: Task 4
- Cloudflare Pages-compatible documentation and verification: Task 5

No spec gaps remain.

### Placeholder Scan

- No `TODO` or `TBD` markers remain.
- Every task includes exact file paths and concrete commands.
- All new identifiers introduced in later tasks are defined in earlier code snippets.

### Type Consistency

- Runtime config uses `serverManagedApi` consistently across `AppSettings`, defaults, store state, and settings UI.
- The backend contract uses `/api/gemini/*` and `/api/live-token` consistently across runtime config, Nginx, README, and compose.
- The server-managed marker key is consistently named `SERVER_MANAGED_API_KEY`.
