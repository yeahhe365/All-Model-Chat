# Performance Loading Boundaries Design

**Date:** 2026-04-20

**Goal:** Keep all current features intact while reducing first-load cost, shrinking eager asset downloads, and making PWA install/update lighter by moving heavy capabilities behind runtime loading boundaries.

## Scope

This change covers:

1. Removing heavyweight runtime dependencies from the main application shell when they are only needed for specific features.
2. Preserving all existing user-facing functionality, including local Python execution, markdown rendering, math rendering, PDF viewing, exports, and PWA support.
3. Narrowing service worker precache coverage so large on-demand assets are fetched only when used.
4. Adding regression tests that lock the new loading boundaries in place.

This change does not cover:

1. Feature removal or degraded rendering/output quality.
2. New product behavior, new settings, or changed workflows.
3. Backend/API performance work.

## Problem Summary

The production build currently pulls multiple heavy feature bundles onto the app shell path. Large vendor chunks for markdown parsing/highlighting, KaTeX, PDF viewing, Pyodide-related runtime code, and runtime `@google/genai` helpers are either eagerly loaded or eagerly preloaded. The service worker also precaches too much of the build output, which makes install and update heavier than necessary.

The result is a slow first open, especially on slower devices and networks, even though many of these features are only needed after the user enters a specific flow such as code execution, PDF preview, or math-heavy rendering.

## Approach

### 1. Tighten Main-Shell Dependency Boundaries

The core shell should only include what is required to boot the app, render layout, restore state, and show the base chat interface.

To achieve that:

- replace direct `pyodideService` imports on the main chat path with a lazy loader
- remove runtime `Type` imports from `@google/genai` where plain schema literals are sufficient
- move markdown rendering behind dynamic imports so the shell does not own the whole parsing/highlighting stack

### 2. Keep Markdown Features Intact, But Load Them On Demand

Markdown, code highlighting, and math rendering should remain fully supported. The optimization is to defer the renderer code until it is actually needed by a message or a dedicated export surface.

The base markdown path and the math-enhanced markdown path should both be lazy. Fallback content may render briefly while the renderer loads, but the final rendered output must remain unchanged.

### 3. Move Math And PDF Styles Out Of The Global Shell

Global CSS imports in the entry file currently force KaTeX and PDF viewer styles into the initial asset set. Those styles should move alongside the lazy feature entry points that actually need them.

Required boundaries:

- KaTeX CSS loads with the full math renderer
- `react-pdf` annotation/text CSS loads with the PDF viewer entry

### 4. Preserve Local Python Execution, But Remove It From First Load

Local Python execution should still work everywhere it works today. The optimization is limited to loading.

Required behavior:

- the code execution UI still appears where it currently appears
- running local Python still initializes the same Pyodide service
- Pyodide assets are fetched only when execution is used

### 5. Keep PWA Support, But Precache Only The App Shell

The service worker should continue to support installability, offline relaunch of the shell, and update prompts. It should stop precaching very large low-frequency assets such as Pyodide payloads and optional heavy feature chunks.

The app shell remains precached. Heavy capability bundles remain available on demand through regular network fetch plus normal browser caching.

## Testing

Add regression coverage that proves:

1. the entry file no longer imports KaTeX/PDF viewer CSS
2. the main chat path no longer statically imports `pyodideService`
3. runtime tool declarations no longer statically import `@google/genai`
4. markdown rendering entry points are lazy
5. the Vite/PWA config excludes large on-demand assets from precache

## Implementation Notes

- Prefer small loader helpers over broad refactors so behavior stays stable.
- Keep existing lazy modal/component patterns where possible.
- Validate the result with a fresh production build, not just source inspection.
