# Pure Frontend Platform Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the app into a safer, adapter-driven pure-frontend architecture while preserving persisted user data and fixing Gemini protocol drift.

**Architecture:** Start with a narrow phase that creates stable seams around Gemini integration, persistence migration, and quality gates. Use that phase to stop protocol breakage and type drift before expanding the refactor into broader feature decomposition.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand, IndexedDB, `@google/genai`

---

## File Structure

- Create: `src/platform/genai/client.ts`
- Create: `src/platform/genai/modelCatalog.ts`
- Create: `src/platform/genai/liveApi.ts`
- Create: `src/platform/persistence/schema.ts`
- Create: `src/platform/persistence/migrations.ts`
- Modify: `src/hooks/live-api/useLiveConnection.ts`
- Modify: `src/hooks/live-api/useLiveConfig.ts`
- Modify: `src/hooks/live-api/useLiveMessageProcessing.ts`
- Modify: `src/services/api/baseApi.ts`
- Modify: `src/utils/apiUtils.ts`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/constants/modelConstants.ts`
- Modify: `src/utils/modelHelpers.ts`
- Modify: `src/hooks/useModelCapabilities.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Test: `src/hooks/live-api/__tests__/useLiveMessageProcessing.test.ts`
- Test: `src/platform/genai/__tests__/liveApi.test.ts`
- Test: `src/platform/persistence/__tests__/migrations.test.ts`
- Test: `src/utils/__tests__/apiUtils.test.ts`
- Test: `src/services/api/__tests__/baseApi.test.ts`

### Task 1: Lock In Live API 3.1 Behavior

**Files:**
- Create: `src/platform/genai/liveApi.ts`
- Modify: `src/hooks/live-api/useLiveConnection.ts`
- Modify: `src/hooks/live-api/useLiveConfig.ts`
- Modify: `src/hooks/live-api/useLiveMessageProcessing.ts`
- Test: `src/platform/genai/__tests__/liveApi.test.ts`
- Test: `src/hooks/live-api/__tests__/useLiveMessageProcessing.test.ts`

- [ ] Write failing tests for Gemini 3.1 text transport selection and multipart server-event parsing.
- [ ] Run the targeted tests and confirm failure against current `sendClientContent` and first-part-only logic.
- [ ] Implement a `liveApi` adapter that selects request mode by model descriptor and exposes helper predicates.
- [ ] Refactor live hooks to use the adapter and iterate over all response parts in each event.
- [ ] Re-run targeted tests and then the full test suite.

### Task 2: Restore Safe Default Request Configuration

**Files:**
- Modify: `src/services/api/baseApi.ts`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/constants/modelConstants.ts`
- Modify: `src/services/api/__tests__/baseApi.test.ts`

- [ ] Write failing tests for safety-setting omission when the user has not customized defaults.
- [ ] Run the targeted base API tests and verify failure.
- [ ] Change request-building logic so default Gemini behavior is preserved unless the user explicitly overrides safety settings.
- [ ] Reconcile thinking defaults between model metadata and request configuration for the touched paths.
- [ ] Re-run targeted tests and the full suite.

### Task 3: Introduce Model Metadata and Remove Stringly Live Decisions

**Files:**
- Create: `src/platform/genai/modelCatalog.ts`
- Modify: `src/utils/modelHelpers.ts`
- Modify: `src/hooks/useModelCapabilities.ts`
- Modify: `src/constants/modelConstants.ts`
- Test: `src/utils/__tests__/modelHelpers.test.ts`

- [ ] Write failing tests for structured capability lookups replacing current `includes(...)` checks on touched model paths.
- [ ] Run model helper tests and confirm failure.
- [ ] Add a typed `ModelDescriptor` catalog for currently supported and deprecated models in scope.
- [ ] Switch live and capability logic to use catalog helpers first, leaving legacy helpers only as compatibility wrappers where needed.
- [ ] Re-run targeted tests and the full suite.

### Task 4: Add Persistence Schema Versioning and Compatibility Entry Point

**Files:**
- Create: `src/platform/persistence/schema.ts`
- Create: `src/platform/persistence/migrations.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/utils/db.ts`
- Test: `src/platform/persistence/__tests__/migrations.test.ts`

- [ ] Write failing tests for version detection, no-op migrations, and future compatibility hooks.
- [ ] Run migration tests and confirm failure.
- [ ] Add a minimal schema-version store and migration pipeline without rewriting existing user data yet.
- [ ] Integrate startup reads through the migration entry point.
- [ ] Re-run targeted tests and the full suite.

### Task 5: Fix Environment Contract and Quality Gates

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/utils/apiUtils.ts`
- Modify: `package.json`
- Modify: `README.md`
- Test: `src/utils/__tests__/apiUtils.test.ts`

- [ ] Write failing tests for environment variable priority and compatibility.
- [ ] Run the API utils tests and confirm failure if the current contract is inconsistent.
- [ ] Align build-time and runtime env variable handling so `VITE_GEMINI_API_KEY` behaves exactly as documented.
- [ ] Make `build` depend on `typecheck` and ensure the touched code path compiles cleanly.
- [ ] Re-run targeted tests, `npm run typecheck`, `npm run build`, and the full suite.

### Task 6: Expand Quality Gates for the Touched Surface

**Files:**
- Modify: touched files from Tasks 1-5
- Test: existing targeted suites

- [ ] Resolve TypeScript and lint issues introduced or exposed in the touched files.
- [ ] Run `npm run typecheck` and confirm that touched-surface regressions are eliminated.
- [ ] Run `npm test` and `npm run build` from the worktree.
- [ ] Summarize remaining repo-wide debt that is intentionally left for later phases.

## Self-Review

- Spec coverage checked: Phase 1 covers Live protocol drift, safety defaults, model metadata foundation, migration scaffolding, env contract, and quality gates.
- Placeholder scan checked: task outputs are concrete and bounded to the current phase.
- Type consistency checked: `ModelDescriptor`, migration entry points, and Live adapter names are consistent across tasks.
