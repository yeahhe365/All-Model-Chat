# Docker Compose + Cloudflare Pages Deployment Design

Date: 2026-04-13
Project: All Model Chat
Status: Approved for spec writing, pending user review before implementation planning

## Summary

Add a deployment model that supports both:

- `docker compose` deployments for self-hosting
- Cloudflare Pages deployments for the static frontend

without forking the app into separate frontend variants.

The chosen design keeps the frontend as a static Vite build and introduces a small standalone API service that:

- proxies standard Gemini API requests
- issues Live API ephemeral tokens
- owns the long-lived `GEMINI_API_KEY`

The frontend will gain runtime-configurable API endpoints and a new server-managed API mode so the app can work without exposing a real Gemini key in the browser.

## Goals

- Make the app deployable via `docker compose up`.
- Keep the frontend deployable as static assets on Cloudflare Pages.
- Prevent long-lived Gemini API keys from being baked into the frontend image for the recommended deployment path.
- Support both standard Gemini requests and Live API ephemeral-token flows through the new backend.
- Preserve the existing advanced settings flow for users who want to manually provide keys or custom proxy URLs.

## Non-Goals

- Rewriting the chat/business logic around a new backend API contract.
- Moving browser-local state such as IndexedDB chat history to the server.
- Replacing the existing custom API/proxy settings UI.
- Requiring Cloudflare-specific backend infrastructure as part of this change.

## Current Constraints

- The current frontend is a static Vite app and should remain one.
- The app currently injects `GEMINI_API_KEY` into the frontend build via `import.meta.env.VITE_GEMINI_API_KEY`.
- Standard Gemini requests currently expect the browser to hold an API key.
- Live API already supports fetching an ephemeral token from a configured endpoint.
- Deployment needs to work in both a same-origin Docker setup and a split frontend/backend setup for Pages.

## Chosen Architecture

### Overview

The system will consist of two deployable units:

1. `web`: the existing static frontend build
2. `api`: a new lightweight backend service

The frontend will talk to backend endpoints through runtime configuration rather than compile-time-only Vite env injection.

### Deployment Modes

#### Docker Compose mode

- `web` runs behind `nginx`
- `api` runs as a Node service
- `nginx` serves the frontend and reverse-proxies `/api/*` to `api`
- the browser uses same-origin requests such as `/api/gemini/...` and `/api/live-token`

#### Cloudflare Pages mode

- Pages serves the static frontend build
- the API service is deployed separately
- runtime config points the frontend to the API service base URL
- the frontend build remains unchanged apart from runtime-config differences

## Frontend Design

### Runtime Config

Add a runtime config layer that is loaded at app startup and merged into the default app settings.

The runtime config must be public-safe and contain no secrets. It should support fields like:

- `serverManagedApi`
- `defaultUseCustomApiConfig`
- `defaultUseApiProxy`
- `defaultApiProxyUrl`
- `defaultLiveApiEphemeralTokenEndpoint`
- `publicApiBaseUrl`

Recommended behavior:

- runtime config overrides hardcoded defaults
- existing persisted user settings in IndexedDB still take precedence once saved
- build-time env remains only as a fallback for legacy/manual deployments

### Server-Managed API Mode

Add a frontend mode that allows requests to proceed even when there is no browser-held Gemini key.

Behavior in this mode:

- the app treats the backend as the API owner
- standard Gemini requests use a placeholder/public marker key internally only if required by existing call sites, but no real key is exposed to the browser
- the configured proxy path is enabled by default
- Live API uses the configured token endpoint

This mode must prevent the current `"API Key not configured."` guard from blocking chat, TTS, token counting, file upload, and other Gemini-backed flows.

### Settings UX

Preserve the existing settings UI but improve defaults:

- Docker/Pages default deployments should work without the user manually entering a key
- advanced users can still override with custom API keys and proxy settings
- the UI should continue to expose the Live token endpoint setting
- the connection test must work in both manual-key mode and server-managed mode

## Backend API Design

### Responsibilities

The new backend service is intentionally narrow:

- health endpoint
- Live API ephemeral token issuance
- Gemini HTTP proxying

It should not own chat history, authentication, or app sessions.

### Endpoints

#### `GET /health`

Returns service health for Docker health checks and external probes.

#### `GET /api/live-token`

Uses the server-side `GEMINI_API_KEY` to obtain a Live API ephemeral token and returns JSON compatible with the frontend's current expectations:

- `{ "name": "..." }`
- or `{ "token": "..." }`

Errors must return JSON with clear messages and meaningful status codes.

#### `/api/gemini/*`

Acts as a transparent reverse proxy to the Gemini API.

Requirements:

- preserve request method, path, query string, and body
- inject the server-side Gemini key
- support streaming responses without buffering the full payload
- pass through relevant headers and content types
- normalize upstream errors into usable JSON when possible

### Configuration

The backend service will read:

- `GEMINI_API_KEY` (required)
- `PORT` (optional)
- `GEMINI_API_BASE` (optional override)
- `ALLOWED_ORIGINS` (optional for split-origin deployments)

## Docker Design

### Services

#### `web`

- multi-stage Docker build
- Node build stage generates `dist`
- Nginx runtime serves static files
- Nginx reverse-proxies `/api/*` to the `api` service
- container also serves the runtime config asset used by the frontend

#### `api`

- lightweight Node runtime
- exposes the backend endpoints above

### Files to Add

- `docker-compose.yml`
- frontend `Dockerfile`
- backend `Dockerfile`
- `nginx.conf`
- backend service source directory and package manifest
- `.env.example`

## Cloudflare Pages Compatibility

This design keeps Pages compatibility by preserving a static frontend artifact.

Requirements for Pages support:

- no Docker-only assumptions in frontend code
- runtime config must support an external API base URL
- backend API contract must be deployment-platform-agnostic
- frontend asset build remains standard Vite output

Future backend targets such as Cloudflare Workers or Pages Functions may implement the same `/api/live-token` and `/api/gemini/*` contract, but that is not required in this change.

## Error Handling

### Frontend

- missing runtime config should fall back cleanly to existing defaults
- server-managed mode should produce actionable errors when backend endpoints are unreachable
- legacy manual-key mode must keep its current validation behavior

### Backend

- return JSON errors for missing `GEMINI_API_KEY`
- return explicit failures for upstream token/proxy errors
- preserve upstream status codes where practical
- avoid leaking secrets in logs or responses

## Testing Strategy

### Frontend tests

- runtime config merges into defaults as expected
- server-managed mode allows request initiation without a local API key
- legacy manual key mode still behaves as before
- Live token endpoint defaults are applied correctly

### Backend tests

- `/health` returns success
- `/api/live-token` handles success, missing env, upstream failure, and malformed upstream payloads
- `/api/gemini/*` forwards requests correctly
- streaming proxy responses are preserved

### Verification

- `npm run typecheck`
- targeted frontend tests for runtime config and API selection logic
- backend test suite
- `docker compose up --build` manual smoke test

## Documentation Updates

README must be updated to cover:

- local Docker Compose deployment
- required environment variables
- runtime config behavior
- Cloudflare Pages frontend deployment with separate backend service
- the difference between public runtime config and server-only secrets

## Implementation Outline

1. Add runtime-config loading to the frontend.
2. Introduce server-managed API mode in frontend request-selection logic.
3. Add the backend API service.
4. Add Dockerfiles, Nginx config, and `docker-compose.yml`.
5. Update README and deployment docs.
6. Verify both Docker and split deployment flows.

## Acceptance Criteria

- A new user can run `docker compose up --build` and open the app without manually entering a Gemini key in the browser.
- Standard Gemini features work through the backend proxy.
- Live API token retrieval works through the backend token endpoint.
- The frontend still builds as static assets suitable for Cloudflare Pages.
- Pages deployments can point the frontend to an external backend through runtime config.
- Manual/custom API configuration still remains available.

## Risks and Mitigations

- Risk: existing frontend code assumes a real key exists locally.
  Mitigation: isolate a server-managed branch in the request-selection helpers and cover it with tests.

- Risk: streaming proxy behavior breaks chat responses.
  Mitigation: implement proxying with streaming support from the start and test it explicitly.

- Risk: runtime config collides with persisted user settings.
  Mitigation: define and document precedence clearly: persisted user settings override runtime defaults after first save.

- Risk: Docker setup works but Pages setup drifts.
  Mitigation: keep the frontend artifact platform-neutral and keep the backend contract simple and documented.

## Decision Record

Chosen approach:

- static frontend + standalone API service
- runtime config instead of Docker-only compile-time configuration
- same backend contract for Docker and Pages-compatible deployments

Rejected alternatives:

- static frontend plus only a Live token endpoint: insufficient because standard Gemini traffic still relies on browser-held keys
- single-container Node app serving both frontend and backend: workable for Docker, but weakens Cloudflare Pages compatibility and blurs deployable boundaries
