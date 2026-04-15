# High-Value React Warnings And Bundle Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the highest-value React lint/compiler warnings in shared UI flows and clear the remaining production build chunk warnings without taking on the broader `any` cleanup.

**Architecture:** Keep the current app boundaries intact and favor local repairs over structural rewrites. Convert effect-driven state resets into derived state or external-store subscriptions where possible, narrow callback dependencies to stable function references, and let Vite split lazily loaded Mermaid and HTML export paths more naturally while documenting the Graphviz trade-off.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, ESLint

---

### Task 1: Add Regression Coverage For Hook State Derivation

**Files:**
- Create: `src/hooks/ui/useMessageStream.test.tsx`
- Create: `src/hooks/useAudioRecorder.test.tsx`
- Modify: `src/components/shared/file-preview/pdf-viewer/PdfToolbar.test.tsx`
- Modify: `src/__tests__/animations.test.ts`

- [x] Add a failing test that verifies `useMessageStream` returns store snapshots while streaming and resets to empty strings when streaming stops.
- [x] Add a failing test that verifies `useAudioRecorder` reports `recording` from recorder status and `review` after `onStop` produces a blob.
- [x] Extend the PDF viewer test so a remounted viewer starts from page 1 and loading state for a new file without relying on an internal reset effect.
- [x] Extend the welcome-screen guardrail test so the source no longer contains the synchronous effect transitions that triggered `react-hooks/set-state-in-effect`.
- [x] Run `npm test -- src/hooks/ui/useMessageStream.test.tsx src/hooks/useAudioRecorder.test.tsx src/components/shared/file-preview/pdf-viewer/PdfToolbar.test.tsx src/__tests__/animations.test.ts`.

### Task 2: Remove High-Value Effect And Render-Time Warning Patterns

**Files:**
- Modify: `src/hooks/ui/useMessageStream.ts`
- Modify: `src/hooks/useAudioRecorder.ts`
- Modify: `src/hooks/ui/usePdfViewer.ts`
- Modify: `src/hooks/ui/usePortaledMenu.ts`
- Modify: `src/components/chat/message-list/WelcomeScreen.tsx`
- Modify: `src/hooks/useLiveAPI.ts`
- Modify: `src/components/layout/MainContent.tsx`

- [x] Refactor `useMessageStream` to read from `streamingStore` via an external-store subscription instead of effect-driven state resets.
- [x] Derive recorder view state from recorder status and recorded audio state rather than synchronizing it in an effect.
- [x] Remove the redundant `file.id` reset effect from `usePdfViewer` because the keyed viewer already remounts on file changes.
- [x] Compute portaled-menu position at open time and on window events instead of synchronously setting position in a layout effect body.
- [x] Move welcome-screen transition state changes onto scheduled callbacks so the effect body no longer performs immediate state writes.
- [x] Pass `sessionHandle` state, not `sessionHandleRef.current`, into `useLiveConfig`.
- [x] Narrow `MainContent` callbacks to stable function dependencies so React compiler warnings no longer point at whole view-model objects.
- [x] Run the focused tests from Task 1 again.

### Task 3: Rebalance Bundle Splitting And Guardrails

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/__tests__/viteConfig.test.ts`

- [x] Add a failing guardrail test for the new chunking policy: Mermaid and HTML export code should stay lazy, while Graphviz is allowed to remain a dedicated heavyweight lazy path.
- [x] Update `vite.config.ts` so Mermaid and HTML export paths are not force-grouped into oversized dedicated manual chunks.
- [x] If Graphviz still stays monolithic after the split changes, set a chunk warning limit that reflects the intentionally lazy Graphviz payload instead of warning on every build.
- [x] Run `npm run build` and confirm the previous chunk warnings no longer appear.

### Task 4: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-15-high-value-react-warnings-bundle.md`

- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Update the status notes below with the verified outcome and any intentionally deferred work.

## Status Notes

- Shared-hook follow-up work landed in the targeted files: `useMessageStream`, `useAudioRecorder`, `usePdfViewer`, `usePortaledMenu`, `useLiveAPI`, `MainContent`, and `WelcomeScreen`.
- New regression coverage now lives in `src/hooks/ui/useMessageStream.test.tsx`, `src/hooks/useAudioRecorder.test.tsx`, the updated PDF toolbar test, and the updated animation/vite guardrail tests.
- `npm run build` succeeds without the previous `html-export-vendor`, `mermaid-vendor`, and `graphviz-vendor` chunk warnings. Mermaid now splits into many smaller lazy chunks, `html2pdf` remains lazy and is smaller than before, and Graphviz stays as an intentionally isolated heavyweight lazy chunk under the updated `chunkSizeWarningLimit`.
- `npm run lint` still reports `344` warnings, down from the earlier `363`, with most remaining backlog still concentrated in `@typescript-eslint/no-explicit-any` plus untouched React-hook warning clusters outside this batch.
- `npm run test` passes with `63` files and `297` tests green in this worktree. Existing Vitest stderr noise about `useChatAreaMessageList must be used within ChatAreaProvider` and the `--localstorage-file` warning still appears during the suite, but the run exits successfully.
