# Full PWA Support Design

**Date:** 2026-04-18

**Goal:** Turn the current manifest-only install surface into a complete PWA with service worker registration, offline app-shell caching, install/update UX, real icon assets, and regression coverage for the main PWA contract.

## Scope

This change covers:

1. Adding a production service worker and wiring Vite to build and register it.
2. Caching the application shell and selected static assets for offline launch.
3. Keeping API requests, runtime config, and other dynamic network traffic on a network-first or pass-through path so stale API responses are not cached accidentally.
4. Replacing inline manifest icons with real static assets and strengthening manifest metadata.
5. Improving install detection and install CTA behavior across browsers that do and do not expose `beforeinstallprompt`.
6. Surfacing app updates so an already-open session can refresh when a new service worker is ready.
7. Adding tests for manifest content, registration wiring, install UX, and build/runtime expectations.

This change does not cover:

1. Full offline chat generation or offline data sync.
2. Background sync, push notifications, periodic sync, or badge APIs.
3. Caching authenticated API responses for replay.

## Problem Summary

The app currently advertises PWA support, but only ships a web app manifest and an install button gated on `beforeinstallprompt`. There is no service worker registration, no offline shell, no update flow, no real icon files, and no automated coverage proving the PWA contract. In practice, the app behaves like a regular SPA with a manifest tag, not a reliable installable web application.

## Approach

### 1. Build-Time PWA Integration

Use `vite-plugin-pwa` with `injectManifest` so the repository owns the service worker behavior directly instead of accepting opaque defaults. This keeps cache rules explicit and makes it easier to exclude dynamic resources such as API traffic, `runtime-config.js`, and other mutable files.

The build should:

- generate and register the service worker only for production builds
- precache the app shell, hashed JS/CSS chunks, manifest, icons, and selected static workers
- keep service worker source in `src/pwa/sw.ts`
- expose registration helpers in a small runtime module so React code can subscribe to `needRefresh` and `offlineReady`

### 2. Offline Strategy

The PWA should support offline relaunch into the shell, not offline model execution.

Required behavior:

- cache-first precache for the shell and hashed assets
- stale-while-revalidate for same-origin static assets that are safe to reuse
- network-only or network-first exclusions for `/api/`, `runtime-config.js`, and other mutable runtime endpoints
- navigation fallback to the built `index.html` so deep links still open offline

This gives users a resilient installed shell without risking stale API payloads.

### 3. Install Experience

The current Settings CTA only works when `beforeinstallprompt` fires. That is too narrow.

The revised install model should:

- keep the deferred prompt flow for browsers that support it
- detect standalone mode more robustly, including iOS-style `navigator.standalone`
- expose three install states: `available`, `installed`, `manual`
- keep the install button enabled for supported manual-install browsers, but change copy to guidance instead of calling `prompt()`

Settings remains the main entry point, but the UX should stop pretending install is impossible just because the browser withholds the event.

### 4. Update Experience

When a new service worker is waiting, the app should show a small non-blocking refresh surface so the user can adopt the new version intentionally.

The simplest safe behavior is:

- subscribe to the PWA registration hook at the app shell level
- show a dismissible banner or toast when `needRefresh` becomes true
- provide `Refresh now` and `Later` actions
- trigger the service worker update flow and reload the page on confirmation

This avoids silent version skew between tabs and keeps the update contract visible.

### 5. Manifest And Icon Assets

Replace inline data URI icons with real PNG assets in `public/` so install surfaces have stable icon files. Strengthen the manifest with a consistent scope and richer metadata that still fits the current deployment model.

Required manifest fields:

- `start_url`
- `scope`
- `display`
- `theme_color`
- `background_color`
- icon set with at least 192 and 512 sizes plus a maskable icon

The app should continue to work from the site root, which matches the current Vite output. If subpath deployment is introduced later, `base` handling can be layered on separately.

### 6. Component Boundaries

Keep the PWA logic split into small focused modules:

- `src/pwa/sw.ts` for service worker behavior
- `src/pwa/register.ts` for runtime registration/update helpers
- `src/pwa/install.ts` for install-state detection and browser guidance
- `src/hooks/core/useAppEvents.ts` for wiring install/update state into the app
- one lightweight UI component for update/install messaging

This avoids stuffing service worker and browser capability logic into the main app component tree.

## Error Handling

- If service worker registration fails, log the failure and leave the app fully usable as a normal SPA.
- If install prompting is unavailable, show manual-install guidance rather than a dead disabled CTA.
- If update activation fails, keep the current session running and let the user retry.
- If icon generation or manifest references break, tests should fail before release.

## Testing

Add or update coverage for:

1. manifest content and real icon references
2. install-state logic across deferred prompt, standalone mode, and manual-install fallback
3. production registration behavior versus dev behavior
4. update-banner visibility when a new service worker is waiting
5. build output containing the expected PWA artifacts

## Implementation Notes

- Prefer `injectManifest` over fully generated runtime caching so the service worker rules stay readable in-repo.
- Do not cache chat API responses or `runtime-config.js`.
- Keep the PWA shell enhancement additive: if a browser does not support parts of the contract, the SPA should still operate normally.
