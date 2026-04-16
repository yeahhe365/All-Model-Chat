# File Card Shared Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the repeated file-card decision logic from `SelectedFileDisplay` and `FileDisplay` without changing either component's layout.

**Architecture:** Introduce one narrow shared helper for derived file-card metadata and keep rendering concerns local to each component. This keeps the change low-risk and easy to verify.

**Tech Stack:** React 18, TypeScript, Vitest, ESLint

---

### Task 1: Add Tests For Shared File-Card Logic

**Files:**
- Create: `src/utils/fileCardUtils.test.ts`
- Modify: `src/components/chat/input/SelectedFileDisplay.test.tsx`

- [x] Add failing helper tests for the shared configuration logic across text, image, pdf, and video files.
- [x] Add a guard in `SelectedFileDisplay.test.tsx` that the component still keeps its dedicated preview-frame class after the refactor.
- [x] Run `npm test -- src/utils/fileCardUtils.test.ts src/components/chat/input/SelectedFileDisplay.test.tsx`.

### Task 2: Extract And Reuse Shared File-Card Derivations

**Files:**
- Create: `src/utils/fileCardUtils.ts`
- Modify: `src/components/chat/input/SelectedFileDisplay.tsx`
- Modify: `src/components/message/FileDisplay.tsx`

- [x] Implement a shared helper that derives category, flags, `canConfigure`, and `ConfigIcon`.
- [x] Replace local duplicated derivation logic in `SelectedFileDisplay`.
- [x] Replace local duplicated derivation logic in `FileDisplay`.
- [x] Re-run `npm test -- src/utils/fileCardUtils.test.ts src/components/chat/input/SelectedFileDisplay.test.tsx`.

### Task 3: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-file-card-shared-logic.md`

- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Update the status notes with the verified result.

## Status Notes

- Shared file-card derivation logic now lives in `src/utils/fileCardUtils.ts`.
- `SelectedFileDisplay` and `FileDisplay` now consume the shared helper for category flags, configurability, and config-icon selection instead of each maintaining the same decision tree locally.
- Focused helper coverage now lives in `src/utils/fileCardUtils.test.ts`, while `SelectedFileDisplay.test.tsx` still guards the preview frame class used by animations.
- `npm run typecheck` passes.
- Later cleanup follow-up work on `main` removed the remaining warning backlog entirely, so `npm run lint` is now clean.
- `npm test` now passes with `70` files and `325` tests green.
- `npm run build` passes and keeps the earlier bundle-warning cleanup intact.
