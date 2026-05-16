# AMC WebUI

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

<div align="center">

  <p>
    <strong>An all-in-one Model Console WebUI centered on Gemini native capabilities, with OpenAI-compatible standard chat support.</strong>
  </p>

  <p>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/Live_Demo-Cloudflare_Pages-6366f1?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Live Demo">
    </a>
    <a href="https://github.com/yeahhe365/AMC-WebUI/actions/workflows/ci.yml" target="_blank">
      <img src="https://img.shields.io/github/actions/workflow/status/yeahhe365/AMC-WebUI/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI">
    </a>
    <a href="https://github.com/yeahhe365/AMC-WebUI/releases" target="_blank">
      <img src="https://img.shields.io/github/v/release/yeahhe365/AMC-WebUI?style=for-the-badge&color=3b82f6" alt="Release">
    </a>
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind-4.2-38BDF8?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind">
    <img src="https://img.shields.io/badge/Gemini_SDK-1.50%2B-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini SDK">
    <img src="https://img.shields.io/badge/PWA-Supported-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA">
  </p>

</div>

---

## Preview

<p align="center">
  <img src="./docs/screenshots/app-desktop-20260426.png" alt="AMC WebUI desktop preview" width="100%">
</p>

## Overview

**AMC WebUI** is a React 18 based all-in-one Model Console WebUI built around Google Gemini native capabilities, with an additional **OpenAI-compatible standard chat mode**. It is designed as a **Local-First** AI workspace: conversations are stored in the browser's IndexedDB by default, while an optional standalone backend lets you host Gemini credentials server-side and proxy API requests safely in trusted deployments.

The project currently focuses on one main application shape: a **Vite + React SPA**.

- **Standard mode**: local Vite development and static builds for day-to-day development or static hosting.
- **Docker mode**: a `web + api` deployment where regular Gemini requests call `/api/gemini/*`, while Live API connects directly from the browser with the local key.
- **Static frontend + standalone API mode**: deploy the frontend to Pages/CDN and run the Node API service separately.

## API Modes

### Gemini Native

- The main feature path for Thinking, Live API, Gemini Files API, Deep Search, Google Search, code execution, image generation, and other Gemini-specific capabilities.
- Can be combined with AMC's Gemini proxy and server-managed credential flow.

### OpenAI Compatible

- A **standard chat** path with its own API keys, Base URL, and model list.
- Requests are sent to `POST {Base URL}/chat/completions`, which fits the OpenAI API, Gemini's OpenAI-compatible endpoint, and other providers that support `chat/completions`.
- Supports both non-streaming and streaming chat, plus common settings such as system prompt, `temperature`, and `top_p`.

### Important Notes

- OpenAI Compatible mode does **not overwrite** Gemini Native settings. Keys and model lists are managed separately.
- OpenAI Compatible mode currently does **not use the Gemini-native tool/generation pipeline**. Gemini-specific features mentioned in this README still depend on Gemini Native mode.
- The OpenAI-compatible Base URL should point to the API root, for example `https://api.openai.com/v1`. AMC appends `/chat/completions` automatically.

---

## Features

### Deep Thinking

- Visualizes reasoning output for Gemini 3.0 / 3.1 / 2.5 family models.
- Supports token budgets and reasoning levels: Minimal, Low, Medium, and High.
- Streams model reasoning in real time when supported.

### Realtime Audio and Video

- Two-way realtime streaming with voice conversations.
- Screen sharing and visual understanding workflows.
- Audio visualization based on AudioWorklet.

### Live Artifacts

- Detects code blocks and renders interactive HTML previews.
- Supports safe inline HTML/SVG, form controls, and follow-up interactions.
- Supports Mermaid and Graphviz diagrams.
- Includes an automatic Live Artifacts generation mode with configurable trigger models, prompt versions, and custom prompts.

### Advanced File Handling

- Browser-side audio preprocessing and compression to reduce upload cost.
- ZIP and folder import for codebase context.
- Supports images, PDFs, videos, audio files, text files, and more.
- Per-file-type control over Gemini Files API upload vs direct Base64 upload.
- Adjustable input detail levels: Unspecified, Low, Medium, and High. Ultra High is available for per-file image configuration.

### Productivity Workflow

- Deep search powered by Google Search with planned search tasks and citations.
- URL context ingestion for adding web pages to conversations.
- Local Python sandbox based on Pyodide (WASM):
  - Preloads numpy, pandas, and matplotlib.
  - Detects imports automatically, and installs scipy and scikit-learn on demand when needed.
  - File mounting and generated file download support.
  - Automatic capture of matplotlib chart output.
- TTS with 30 voices.
- Speech transcription through Gemini models.
- Imagen 4.0 image generation with Fast, Standard, and Ultra tiers.

### API Management

- Dual API modes: switch between Gemini Native and OpenAI Compatible request paths.
- Multiple API key rotation for both Gemini-native keys and OpenAI-compatible keys.
- Isolated configuration: OpenAI Compatible mode uses its own keys, Base URL, and model list without mutating Gemini settings.
- Custom Gemini API proxy support through the native `baseUrl` configuration in the SDK.

### Internationalized UI

- Chinese, English, and system language modes.
- Translated UI across chat, settings, sidebars, shortcuts, and related workflows.

### PWA

- Web App Manifest, Service Worker, and install/update prompts.
- Installable on desktop and mobile.
- Offline application shell support. Model responses and remote API features still require network access.
- Picture-in-Picture mode support.

### Usage and Pricing Logs

- Strict pricing mode: prices are shown only when stored usage data can reproduce official billing precisely.
- New chat, TTS, transcription, and some image generation requests record richer billing metadata.
- Text-only chats supplement `TEXT -> TEXT` modal evidence locally, so pricing can be shown for supported Gemini text models.
- Historical records with incomplete pricing evidence continue to show `-`.

### More

- Cross-tab synchronization through BroadcastChannel, with Web Locks protecting IndexedDB writes.
- Custom keyboard shortcuts.
- Configurable safety settings across harassment, hate speech, sexual content, dangerous content, and civic integrity categories, with Off, Block None, Block Few, Block Some, and Block Most levels.
- Onyx and Pearl themes with system theme support.
- Import/export for chat history, settings, and scenarios.
- Session grouping, full-text session search, and a developer log panel.

---

## Quick Start

### Option 1: Standard Development

Use Node.js 26 for local development. The repository includes `.nvmrc`, and CI plus Docker use the same major version. The repository enables `engine-strict`, so `npm install` fails on Node 27+ or Node 25 and older; run `nvm use` first when needed.

```bash
git clone https://github.com/yeahhe365/AMC-WebUI.git
cd AMC-WebUI

npm install
npm run dev
```

To inspect production bundle size, run:

```bash
npm run build:analyze
```

The command writes `dist/bundle-stats.html` for reviewing the main bundle, lazy chunks, and PWA precache boundaries.

Open `http://localhost:5175`, then add your Gemini API key in **Settings -> API Configuration**.

For local frontend development, you can also create `.env.local` in the repository root:

```bash
GEMINI_API_KEY=your_api_key_here
VITE_OPENAI_API_KEY=your_openai_compatible_key_here
```

To use OpenAI Compatible mode:

1. Open **Settings -> API Configuration** and switch the API mode to **OpenAI Compatible**.
2. Enter an OpenAI-compatible API key, or preload `VITE_OPENAI_API_KEY` in `.env.local`.
3. Set the OpenAI-compatible Base URL, for example `https://api.openai.com/v1`.
4. Open **Settings -> Models** and choose or edit the dedicated model list for this mode.

Example Base URLs:

- OpenAI: `https://api.openai.com/v1`
- Gemini OpenAI-compatible endpoint: `https://generativelanguage.googleapis.com/v1beta/openai`
- Any other compatible provider: use the `/v1` root or equivalent root that serves `chat/completions`

### Option 2: Docker Compose (Recommended for Personal Use)

The Docker deployment contains two services:

- `web`: Nginx serves the frontend and proxies `/api/*` to the API service.
- `api`: Node service for `/api/gemini/*`.

```bash
npm run build
docker compose up -d --build
```

The default URL is `http://localhost:8080`. Stop it with:

```bash
docker compose down
```

Notes:

- Docker defaults to BYOK for personal deployments. After startup, enter your Gemini API key in **Settings -> API Configuration** to use both regular chat and Live API. You do not need to set `GEMINI_API_KEY` in `.env` or `docker-compose.yml`.
- The `web` image packages the already built local `dist/` directory.
- After frontend changes, run `npm run build` before rebuilding the Docker services.

> Security note
>
> The `web + api` proxy setup is intended for trusted self-hosted deployments. The default BYOK mode uses the API key stored in the browser settings for requests, and it is not a complete public multi-user API gateway. Add authentication, quotas, rate limiting, abuse protection, audit logging, and tenant isolation before exposing it publicly.

### Runtime Configuration and Environment Variables

| Variable                        | Purpose                                                                                          | Public                | Docker default                              |
| :------------------------------ | :----------------------------------------------------------------------------------------------- | :-------------------- | :------------------------------------------ |
| `GEMINI_API_KEY`                | Optional server-managed Gemini API key; when set, it takes precedence over browser settings keys | Server only           | Empty                                       |
| `PORT`                          | Port used by the API service                                                                     | Server only           | `3001`                                      |
| `GEMINI_API_BASE`               | Upstream Gemini API base URL                                                                     | Server only           | `https://generativelanguage.googleapis.com` |
| `ALLOWED_ORIGINS`               | Comma-separated CORS allowlist for cross-origin deployments                                      | Server only           | Empty                                       |
| `RUNTIME_SERVER_MANAGED_API`    | Enables server-managed API mode by default in the frontend                                       | Public runtime config | `false`                                     |
| `RUNTIME_USE_CUSTOM_API_CONFIG` | Enables custom API configuration by default                                                      | Public runtime config | `true`                                      |
| `RUNTIME_USE_API_PROXY`         | Enables API proxy mode by default                                                                | Public runtime config | `true`                                      |
| `RUNTIME_API_PROXY_URL`         | Default Gemini proxy URL for the frontend                                                        | Public runtime config | `/api/gemini`                               |
| `RUNTIME_PYODIDE_BASE_URL`      | Optional Pyodide runtime asset URL; when blank, same-origin `/pyodide/` is used                  | Public runtime config | Empty                                       |

The `RUNTIME_*` values are written into `runtime-config.js` at container startup and are readable by the browser. Only put public configuration there. The public/runtime-config.js template is used for static builds and keeps custom API configuration and proxy mode disabled by default; Docker overwrites it through `docker/web-entrypoint.sh` using the defaults above.

Pyodide assets are copied to `dist/pyodide/` during production builds and load from same-origin `/pyodide/` by default. To use a CDN or a separate static host, set `RUNTIME_PYODIDE_BASE_URL` to a full directory URL such as `https://cdn.jsdelivr.net/pyodide/v0.25.1/full/`. The PWA precache excludes large `pyodide/` assets by default, so local Python loads them on demand the first time it runs.

Docker defaults to BYOK: after you enter an API key in Settings, regular Gemini proxy requests use the browser-provided key, and Live API uses the browser-local key directly to open the official Live WebSocket connection. AMC no longer mints a backend Live token.

If you want server-managed credentials for regular Gemini requests, set `GEMINI_API_KEY` and `RUNTIME_SERVER_MANAGED_API=true`. Live API still requires an API key available in the browser. A browser-local key is suitable for personal or trusted deployments, but it is not a server secret: scripts running in the same browser context, extensions, XSS, or device compromise may still read it.

OpenAI Compatible mode currently does not read `RUNTIME_API_PROXY_URL`, `RUNTIME_USE_API_PROXY`, or `RUNTIME_SERVER_MANAGED_API`. It sends `chat/completions` requests directly to the OpenAI-compatible Base URL configured in Settings, using its separate key set. If you want that mode to pass through your own gateway, point the Base URL at that gateway directly.

### Option 3: Cloudflare Pages + Standalone API

You can deploy the frontend to Cloudflare Pages and run `server/` as a separate Node service on a VM, container platform, or serverless container runtime.

1. Build and publish the frontend `dist` directory:

```bash
npm run build
```

2. Build and start the standalone API service:

```bash
npm run build:api
npm run start:api
```

3. Point the frontend runtime config to your public API URL:

```text
RUNTIME_API_PROXY_URL=https://your-api.example.com/api/gemini
```

4. Set `GEMINI_API_KEY` in the backend environment if you want server-managed credentials for regular Gemini requests. For BYOK, you can omit it. For cross-origin deployments, optionally set `ALLOWED_ORIGINS=https://your-pages-domain.pages.dev`. Live API does not use a standalone API token endpoint; it connects directly from the browser.

Additional notes:

- `server/` currently serves the Gemini-native proxy path. OpenAI Compatible mode does not use that Node API by default.
- If you want OpenAI Compatible traffic to use a self-hosted gateway, set that gateway's compatible Base URL in the frontend settings directly.

#### Optional: Use AIStudioToAPI as a Gemini-Compatible Backend

If you want to use a Google AI Studio web account as the API source, you can also try deploying [AIStudioToAPI](https://github.com/iBUHub/AIStudioToAPI) as a third-party Gemini-compatible backend. It exposes Gemini Native API style `/v1beta/*` endpoints and can be used as the custom API proxy for AMC WebUI.

Example:

```text
RUNTIME_API_PROXY_URL=https://your-aistudio-to-api.example.com/v1beta
```

You can also open **Settings -> API Configuration**, enable custom API configuration and API proxy, then enter the AIStudioToAPI Gemini-compatible Base URL, such as `http://localhost:7860/v1beta`. The API key entered in AMC WebUI should match one of the `API_KEYS` configured for the AIStudioToAPI deployment.

Note: AIStudioToAPI is a third-party project, so review its account login, authentication, rate limiting, and public exposure risks before use. It can replace the regular Gemini API proxy source. AMC WebUI's Live API currently connects directly from the browser to the official Live service and no longer depends on an AMC backend token endpoint.

### Build and Preview

```bash
npm run build
npm run preview
```

### Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run knip
npm run build
npm run build:api

# Or run the full verification pipeline
npm run verify
```

To verify Gemini Code Execution related behavior:

```bash
npm run test:code-execution
```

This covers:

- MIME and upload strategy handling for text, CSV, and code files.
- Code Execution request construction and multi-turn history replay.
- Streaming `thoughtSignature` preservation.
- Live API display for `codeExecutionResult.output`.

For a manual API integration check with a real Gemini key:

```bash
GEMINI_API_KEY=your_key_here npm run verify:code-execution:api
```

Optional variable:

- `CODE_EXECUTION_MODEL`: override the default model, which is `gemini-2.5-flash`.

---

## Architecture

| Layer          | Stack                                                                                                     |
| :------------- | :-------------------------------------------------------------------------------------------------------- |
| Core framework | React 18 + TypeScript 5.5 + Vite 7                                                                        |
| Styling        | Tailwind CSS 4 + CSS variable based theme system                                                          |
| Persistence    | Native IndexedDB wrapper with Web Locks for cross-tab write safety                                        |
| Gemini SDK     | `@google/genai` 1.50+ for streaming, non-streaming, file upload, image generation, TTS, and transcription |
| Audio          | AudioWorklet API plus browser Worker based audio preprocessing and compression                            |
| Rendering      | React-Markdown + KaTeX + Highlight.js + Mermaid + Graphviz                                                |
| Python sandbox | Pyodide (WASM) in a Web Worker, with common packages preloaded and extra packages installed on demand     |
| API proxy      | Gemini proxy through `@google/genai` `httpOptions.baseUrl`                                                |
| PWA            | Web App Manifest + install/update event handling                                                          |
| Deployment     | Vite static build, Docker Compose (`web + api`), or Cloudflare Pages + standalone API                     |

When using server-managed mode for regular Gemini API requests in production, the frontend calls:

- `/api/gemini/*`

Live API uses the browser-local API key to connect directly to the official Live service.

---

## Project Structure

Core frontend areas include `src/components/`, `src/features/`, `src/hooks/`, `src/services/`, `src/pwa/`, `src/schemas/`, and `src/test/`.

Placement rules:

- `src/components/` contains renderable UI and UI-specific view models; reusable controls belong in `components/shared/`.
- `src/features/` contains domain capability boundaries such as message sending, local Python, audio processing, and the standard chat tool loop.
- `src/hooks/` contains React orchestration; hooks that are only a React entry point for one domain should keep naming close to that domain.
- `src/services/` contains external-system and persistence boundaries such as API clients, IndexedDB, logging, and object URL lifecycle management.
- `src/utils/` contains pure utilities without React state or external side effects; multi-file domain utilities should use a subdirectory.
- `src/test/architecture/` contains structure and style guardrail tests that keep cleaned-up problems from returning.
- Cross-directory imports inside `src` use the `@/` alias; same-directory imports keep `./`.

```text
AMC-WebUI/
├── src/                        # Frontend source code (Vite SPA)
│   ├── components/             # UI components for chat, messages, layout, settings, modals, and more
│   ├── features/               # Local Python (src/features/local-python/), message sending, scenarios, audio, and standard chat features
│   ├── hooks/                  # App, chat, input, data management, live API, and UI hooks
│   ├── services/               # API, IndexedDB, logging, object URL, and infrastructure services
│   ├── stores/                 # Zustand stores for chat, settings, and UI state
│   ├── utils/                  # Export, session, IndexedDB, Markdown, file, and media utilities
│   ├── pwa/                    # Service worker, PWA registration, and install state
│   ├── runtime/                # Runtime config loading and public config mapping
│   ├── schemas/                # Zod configuration schemas
│   ├── contexts/               # I18n, WindowContext, and related providers
│   ├── constants/              # Models, prompts, shortcuts, themes, and app constants
│   ├── test/                   # Test utilities, fixtures, and architecture regression tests
│   ├── types/                  # TypeScript types
│   ├── styles/                 # Global styles, animations, and Markdown styles
│   ├── App.tsx                 # App root component
│   └── index.tsx               # React mount entry
├── server/                     # Standalone Node API for /api/gemini/*
├── public/                     # Static assets and runtime-config.js template
├── e2e/                        # Playwright tests
├── docs/                       # Screenshots and documentation assets
├── docker/                     # Deployment helper scripts
├── vite.config.ts              # Vite config
├── playwright.config.ts        # E2E config
├── vitest.config.ts            # Unit and integration test config
├── eslint.config.js            # ESLint config
├── knip.json                   # Unused file/export analysis config
├── package.json                # Dependencies and scripts
└── docker-compose.yml          # web + api deployment entry
```

---

## Gemini Native Default Models

OpenAI Compatible mode uses a separate model list that you can manage manually or fetch from a compatible endpoint. The table below lists the built-in Gemini Native defaults.

| Type             | Models                                                                                                       |
| :--------------- | :----------------------------------------------------------------------------------------------------------- |
| Gemini 3.x       | `gemini-3-flash-preview`, `gemini-3.1-flash-live-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview` |
| Robotics         | `gemini-robotics-er-1.6-preview`                                                                             |
| Gemma 4          | `gemma-4-31b-it`, `gemma-4-26b-a4b-it`                                                                       |
| Imagen 4.0       | `imagen-4.0-fast-generate-001`, `imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`                   |
| Image generation | `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`                     |
| TTS              | `gemini-3.1-flash-tts-preview` with 30 voices                                                                |

---

## Contributing

Contributions are welcome.

1. Report issues through [GitHub Issues](https://github.com/yeahhe365/AMC-WebUI/issues).
2. Fork the repository, create a feature branch, and open a Pull Request.
3. Support ongoing development by starring the project or visiting [Afdian](https://afdian.com/a/gemini-nexus).

---

## Related Community

- [Linux.do](https://linux.do/): an active Chinese tech community focused on AI, software development, resource sharing, and frontier technology discussions. Its vision is "a new ideal community", and its community culture emphasizes sincerity, friendliness, unity, and professionalism.

---

<div align="center">
  <p>Developed with :heart: by <strong>yeahhe365</strong></p>
</div>
