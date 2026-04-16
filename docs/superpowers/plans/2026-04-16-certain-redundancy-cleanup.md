# Certain Redundancy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the most certain low-risk redundancies without widening into broad architectural cleanup.

**Architecture:** Prefer targeted source cleanup over behavior changes. Keep public exports where helpful for compatibility, but remove duplicate implementations and dead type surface.

**Tech Stack:** React 18, TypeScript, Vitest, ESLint

---

### Task 1: Add Redundancy Guard Tests

**Files:**
- Create: `src/__tests__/certainRedundancyCleanup.test.ts`

- [x] Add failing source guards for the removed identity wrappers in `mainContentModels.ts`.
- [x] Add a failing source guard asserting `sanitizeSessionForExport` reuses `stripSessionFilePayloads`.
- [x] Add a failing source guard for the duplicate `setInputText` write in `useChatInput.ts`.
- [x] Add failing source guards for the low-risk unused interfaces/parameters removed in this batch.
- [x] Run `npm test -- src/__tests__/certainRedundancyCleanup.test.ts`.

### Task 2: Remove The Certain Redundancies

**Files:**
- Modify: `src/components/layout/MainContent.tsx`
- Modify: `src/components/layout/mainContentModels.ts`
- Modify: `src/components/layout/mainContentModels.test.ts`
- Modify: `src/utils/chat/session.ts`
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/hooks/useSlashCommands.ts` only if needed for dependency cleanup
- Modify: `src/components/settings/controls/ModelSelector.tsx`
- Modify: `src/components/settings/ModelVoiceSettings.tsx`
- Modify: `src/hooks/live-api/useLiveConfig.ts`
- Modify: `src/hooks/live-api/useLiveConfig.test.tsx`
- Modify: `src/hooks/live-api/useLiveConnection.ts`
- Modify: `src/hooks/live-api/useLiveConnection.test.tsx`
- Modify: `src/components/sidebar/HistorySidebar.tsx`

- [x] Inline the two identity wrappers in `MainContent` and delete them from `mainContentModels.ts`.
- [x] Remove or replace the obsolete wrapper-focused test in `mainContentModels.test.ts`.
- [x] Make `sanitizeSessionForExport` reuse `stripSessionFilePayloads` directly.
- [x] Remove the duplicate `setInputText` write from `useChatInput.handleInputChange`.
- [x] Remove the unused `t`, `appSettings`, `chatSettings`, and `language` parameters from the listed components/hooks/tests.
- [x] Re-run `npm test -- src/__tests__/certainRedundancyCleanup.test.ts`.

### Task 3: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-certain-redundancy-cleanup.md`

- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Update the status notes with the verified result.

## Status Notes

- The `buildAppModalsProps` and `buildChatAreaInputActions` identity wrappers are gone; `MainContent` now passes the memoized objects directly.
- `sanitizeSessionForExport` now reuses `stripSessionFilePayloads` instead of carrying a second copy of the same message/file traversal logic.
- `useChatInput.handleInputChange` now delegates input updates to `useSlashCommands` without a second direct `setInputText` call.
- Low-risk unused interface cleanup landed in:
  - `src/components/settings/controls/ModelSelector.tsx` (`t`)
  - `src/hooks/live-api/useLiveConfig.ts` (`appSettings`)
  - `src/hooks/live-api/useLiveConnection.ts` (`chatSettings`)
  - `src/components/sidebar/HistorySidebar.tsx` (`language`)
- Guardrail coverage now lives in `src/__tests__/certainRedundancyCleanup.test.ts`.
- Focused tests pass for `mainContentModels`, `session`, `useLiveConfig`, and `useLiveConnection`, and later follow-up work on `main` brings full `npm test` coverage to `70` files and `325` tests green.
- `npm run typecheck` passes.
- Later cleanup follow-up work on `main` removed the remaining warning backlog entirely, so `npm run lint` is now clean.
- `npm run build` passes and preserves the earlier bundle-warning cleanup.
