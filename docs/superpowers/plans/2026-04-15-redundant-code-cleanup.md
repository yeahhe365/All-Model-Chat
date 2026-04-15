# Redundant Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove a small batch of redundant state and dead interfaces without changing observable chat behavior.

**Architecture:** Keep behavior stable and target only redundant synchronization layers. Use keyed remounting for modal draft resets, derived load state for deferred diagrams, and direct API surface cleanup for slash commands.

**Tech Stack:** React 18, TypeScript, Vitest, ESLint

---

### Task 1: Add Guardrail Tests For Redundant Patterns

**Files:**
- Modify: `src/components/modals/FileConfigurationModal.test.tsx`
- Modify: `src/components/__tests__/deferredDiagramBlock.test.tsx`
- Create: `src/hooks/useSlashCommands.test.ts`

- [x] Add a failing source guard that asserts `FileConfigurationModal` no longer mirrors file props into four separate state slices with an initialization effect.
- [x] Add a failing source guard that asserts `DeferredDiagramBlock` no longer uses a dedicated eager-to-loading sync effect.
- [x] Add a failing source guard that asserts `useSlashCommands` no longer references `onStopGenerating`.
- [x] Run `npm test -- src/components/modals/FileConfigurationModal.test.tsx src/components/__tests__/deferredDiagramBlock.test.tsx src/hooks/useSlashCommands.test.ts`.

### Task 2: Remove The Redundant Code

**Files:**
- Modify: `src/components/modals/FileConfigurationModal.tsx`
- Modify: `src/components/message/blocks/DeferredDiagramBlock.tsx`
- Modify: `src/hooks/useSlashCommands.ts`
- Modify: `src/hooks/chat-input/useChatInput.ts`

- [x] Refactor `FileConfigurationModal` to use a keyed inner component and a single draft object initialized from the file.
- [x] Refactor `DeferredDiagramBlock` to use a derived load flag instead of synchronizing `eager` into `isLoading` via effect.
- [x] Remove the unused `onStopGenerating` prop from `useSlashCommands` and its only call site.
- [x] Re-run the focused tests from Task 1.

### Task 3: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-15-redundant-code-cleanup.md`

- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Update the status notes with the verified outcome.

## Status Notes

- `FileConfigurationModal` now uses a keyed inner content component plus a single draft object instead of four mirrored state fields and a prop-sync effect.
- `DeferredDiagramBlock` now derives loading from `eager || loadRequested`, so the old eager-to-loading synchronization effect is gone.
- `useSlashCommands` no longer accepts or depends on the unused `onStopGenerating` callback, and `useChatInput` no longer passes it.
- New guardrail coverage lives in `src/components/modals/FileConfigurationModal.test.tsx`, `src/components/__tests__/deferredDiagramBlock.test.tsx`, and `src/hooks/useSlashCommands.test.ts`.
- `npm test` passes with `64` files and `300` tests green.
- `npm run build` passes and preserves the earlier bundle-warning cleanup.
- `npm run lint` passes with `342` warnings, down from the previous `344`; the remaining backlog is still mostly `@typescript-eslint/no-explicit-any` plus other deferred React warning clusters.
