# File Preview State Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the most obvious redundant state ownership inside the file preview flow.

**Architecture:** Keep the current UI intact while narrowing state ownership. `FilePreviewHeader` should own copy UX, `TextFileViewer` should only own fetched content, and `FilePreviewModal` should own edit draft state only for the currently keyed file.

**Tech Stack:** React 18, TypeScript, Vitest, ESLint

---

### Task 1: Add Guardrail Tests

**Files:**
- Create: `src/__tests__/filePreviewStateCleanup.test.ts`

- [x] Add failing source guards that `FilePreviewHeader` no longer exposes `onCopy` and `isCopied`.
- [x] Add a failing source guard that `TextFileViewer` no longer mirrors controlled `content` via `setLocalContent(content)`.
- [x] Add a failing source guard that `FilePreviewModal` no longer resets file-derived state with an effect.
- [x] Run `npm test -- src/__tests__/filePreviewStateCleanup.test.ts`.

### Task 2: Remove File Preview Redundant State

**Files:**
- Modify: `src/components/shared/file-preview/FilePreviewHeader.tsx`
- Modify: `src/components/shared/file-preview/TextFileViewer.tsx`
- Modify: `src/components/modals/FilePreviewModal.tsx`

- [x] Remove the external copy state props from `FilePreviewHeader` and let it own the copy lifecycle internally.
- [x] Make `TextFileViewer` treat `content` as a controlled input without copying it into `localContent`.
- [x] Replace `FilePreviewModal`'s file-sync effect with a keyed inner component and only pass controlled text content during edit mode.
- [x] Re-run `npm test -- src/__tests__/filePreviewStateCleanup.test.ts`.

### Task 3: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-file-preview-state-cleanup.md`

- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Update the status notes with the verified result.

## Status Notes

- `FilePreviewHeader` now owns copy UI state fully; the external `onCopy` and `isCopied` bridge is gone.
- `TextFileViewer` no longer mirrors controlled `content` into `localContent`, so controlled mode only renders the passed-in value while uncontrolled mode still owns fetched content.
- `FilePreviewModal` now resets file-derived state by remounting a keyed inner content component instead of synchronizing with a `file` effect, and it only passes controlled content to `TextFileViewer` while editing.
- Source guard coverage now lives in `src/__tests__/filePreviewStateCleanup.test.ts`.
- `npm run typecheck` passes.
- `npm run lint` passes with `331` warnings, down from the previous `332`.
- `npm test` passes with `67` files and `310` tests green.
- `npm run build` passes and keeps the earlier bundle-warning cleanup intact.
