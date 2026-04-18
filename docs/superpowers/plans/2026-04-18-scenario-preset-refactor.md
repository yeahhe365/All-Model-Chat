# Scenario Preset Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize scenario preset rules so system presets, user-seeded presets, imports, exports, migrations, and modal save behavior all follow one consistent implementation.

**Architecture:** Introduce a pure scenario library module that owns preset catalogs, DB cleanup/migration rules, import merge behavior, and export filtering. Update scenario hooks and UI entry points to consume that module instead of each maintaining their own scenario semantics.

**Tech Stack:** React, TypeScript, Vitest, existing IndexedDB/localStorage utilities

---

### Task 1: Add centralized scenario library

**Files:**
- Create: `src/features/scenarios/scenarioLibrary.ts`
- Create: `src/features/scenarios/scenarioLibrary.test.ts`

- [ ] Define system preset arrays, user seed definitions, removed/deprecated preset ids, migration helpers, import merge helpers, and export filtering in `src/features/scenarios/scenarioLibrary.ts`.
- [ ] Write focused tests in `src/features/scenarios/scenarioLibrary.test.ts` covering migration cleanup, seed application, export filtering, and duplicate-safe import merging.
- [ ] Run: `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run src/features/scenarios/scenarioLibrary.test.ts`

### Task 2: Rewire scenario loading and persistence

**Files:**
- Modify: `src/hooks/usePreloadedScenarios.ts`
- Delete: `src/hooks/preloadedScenarioSeeds.ts`
- Modify: `src/hooks/usePreloadedScenarios.test.tsx`
- Delete: `src/hooks/preloadedScenarioSeeds.test.ts`

- [ ] Replace direct seed logic in `src/hooks/usePreloadedScenarios.ts` with the new scenario library API for initialization, persisted-user extraction, and rendered scenario list construction.
- [ ] Update `src/hooks/usePreloadedScenarios.test.tsx` to assert the refactored scenario classification behavior.
- [ ] Remove the now-redundant seed helper module and its tests once coverage exists in the centralized library tests.
- [ ] Run: `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run src/features/scenarios/scenarioLibrary.test.ts src/hooks/usePreloadedScenarios.test.tsx`

### Task 3: Unify import/export semantics across UI entry points

**Files:**
- Modify: `src/hooks/features/useScenarioManager.ts`
- Modify: `src/hooks/data-management/useDataExport.ts`
- Modify: `src/hooks/data-management/useDataImport.ts`
- Modify: `src/hooks/app/useApp.ts`

- [ ] Refactor scenario-manager import/export to use the centralized merge/export helpers.
- [ ] Refactor settings-page scenario import/export to use the exact same merge/export helpers and current scenario state.
- [ ] Thread any additional data needed by `useDataImport` from `useApp` so settings-page import can merge instead of replace.
- [ ] Add or update tests for the refactored import/export behavior where practical in the touched modules’ existing test surfaces or the centralized library tests.
- [ ] Run targeted Vitest commands for any newly added or updated tests.

### Task 4: Make modal close semantics explicit

**Files:**
- Modify: `src/components/scenarios/PreloadedMessagesModal.tsx`
- Modify: `src/hooks/features/useScenarioManager.ts`

- [ ] Change modal dismissal (`Esc`, backdrop click, close button) to discard unsaved scenario-library edits instead of auto-saving.
- [ ] Add an explicit “Save” action in the modal list view that persists scenario-library changes.
- [ ] Expose dirty-state if needed so the explicit save affordance can reflect whether there is anything to commit.
- [ ] Run targeted tests if added; otherwise cover the underlying rule transitions in the centralized library tests.

### Task 5: Verify the refactor end-to-end

**Files:**
- Modify: `src/components/modals/AppModals.tsx` only if required by the UI changes above

- [ ] Run: `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run src/features/scenarios/scenarioLibrary.test.ts src/hooks/usePreloadedScenarios.test.tsx`
- [ ] Run: `npm run typecheck`
- [ ] Run: `npx eslint src/features/scenarios/scenarioLibrary.ts src/features/scenarios/scenarioLibrary.test.ts src/hooks/usePreloadedScenarios.ts src/hooks/usePreloadedScenarios.test.tsx src/hooks/features/useScenarioManager.ts src/hooks/data-management/useDataExport.ts src/hooks/data-management/useDataImport.ts src/components/scenarios/PreloadedMessagesModal.tsx src/hooks/app/useApp.ts`
- [ ] Run: `npm run build`
