# Performance Loading Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce first-load cost and PWA install/update weight without changing any feature behavior by moving heavyweight capabilities behind runtime loading boundaries.

**Architecture:** Keep the app shell focused on layout, state, and core chat flows. Move Pyodide access, markdown/math rendering, PDF viewer styles, and runtime `@google/genai` helpers behind explicit lazy boundaries. Tighten the PWA precache list so only shell-critical assets are installed up front.

**Tech Stack:** Vite 5, React 18, TypeScript, vite-plugin-pwa, Workbox injectManifest, Vitest

---

### Task 1: Lock The Loading Boundaries With Failing Tests

**Files:**
- Modify: `src/__tests__/viteConfig.test.ts`

- [ ] **Step 1: Add source assertions for lazy markdown, lazy Pyodide access, lazy CSS ownership, and PWA precache exclusions**
- [ ] **Step 2: Run the focused Vitest suite and confirm it fails for the expected reasons**

### Task 2: Remove Heavy Runtime Imports From The Shell

**Files:**
- Create: `src/services/loadPyodideService.ts`
- Modify: `src/hooks/chat/useChat.ts`
- Modify: `src/hooks/message-sender/useStandardChat.ts`
- Modify: `src/hooks/usePyodide.ts`
- Modify: `src/features/standard-chat/standardClientFunctions.ts`
- Modify: `src/hooks/live-api/liveClientFunctions.ts`

- [ ] **Step 1: Introduce a shared lazy loader for `pyodideService`**
- [ ] **Step 2: Swap direct shell-path imports to use the lazy loader**
- [ ] **Step 3: Replace runtime `Type` enum usage with plain schema literals**
- [ ] **Step 4: Run focused tests**

### Task 3: Make Markdown, Math, And PDF Styles Truly On Demand

**Files:**
- Create: `src/components/message/BaseMarkdownRendererEntry.tsx`
- Create: `src/components/shared/file-preview/PdfViewerEntry.tsx`
- Modify: `src/components/message/LazyMarkdownRenderer.tsx`
- Modify: `src/components/message/MarkdownRenderer.tsx`
- Modify: `src/components/modals/FilePreviewModal.tsx`
- Modify: `src/index.tsx`

- [ ] **Step 1: Move base markdown rendering behind a lazy entry point**
- [ ] **Step 2: Keep math rendering lazy and move KaTeX CSS ownership into the math renderer**
- [ ] **Step 3: Move `react-pdf` CSS ownership into a lazy PDF viewer entry**
- [ ] **Step 4: Run focused tests**

### Task 4: Narrow PWA Precache To The App Shell

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/pwa/sw.ts`

- [ ] **Step 1: Exclude Pyodide payloads and other heavy on-demand assets from precache inputs**
- [ ] **Step 2: Keep shell-safe runtime caching rules intact**
- [ ] **Step 3: Run build verification**

### Task 5: Verify The Outcome

**Files:**
- Modify: `src/__tests__/viteConfig.test.ts` (if final expectations need build-backed tightening)

- [ ] **Step 1: Run the focused Vitest suite**
- [ ] **Step 2: Run `npm run build`**
- [ ] **Step 3: Confirm the entry preload set no longer includes the removed heavy shell assets**
- [ ] **Step 4: Summarize residual risks and remaining large on-demand bundles**
