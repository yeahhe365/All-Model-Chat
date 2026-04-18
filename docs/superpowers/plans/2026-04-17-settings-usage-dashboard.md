# Settings Usage Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Usage tab inside Settings that shows request counts and token consumption by model across selectable time ranges.

**Architecture:** Extend IndexedDB with a dedicated `api_usage` time-series store, keep the existing `localStorage` aggregate for the developer log viewer unchanged, and build a settings-only dashboard that queries and aggregates recent usage records asynchronously. The UI will follow the existing settings section pattern and register as a new sidebar tab.

**Tech Stack:** React 18, IndexedDB, Zustand-backed settings UI, Vitest, Tailwind CSS

---

### Task 1: Lock The New Storage And UI Contract With Tests

**Files:**
- Modify: `src/utils/__tests__/db.version-fallback.test.ts`
- Create: `src/components/settings/sections/UsageSection.test.tsx`
- Create: `src/components/settings/SettingsContent.test.tsx`

- [ ] **Step 1: Add a failing DB fallback assertion for the new schema version**
- [ ] **Step 2: Add a failing settings content test for the `usage` tab render path**
- [ ] **Step 3: Add a failing usage section test covering aggregation and time filter rendering**
- [ ] **Step 4: Run the focused tests and confirm they fail**

### Task 2: Implement Time-Series Usage Storage And Capture

**Files:**
- Modify: `src/utils/db.ts`
- Modify: `src/services/logService.ts`

- [ ] **Step 1: Upgrade IndexedDB to version 5 and create the `api_usage` store with a `timestamp` index**
- [ ] **Step 2: Add DB helpers to insert usage records and query a time range**
- [ ] **Step 3: Update `recordTokenUsage` to append timestamped records while preserving the existing log-viewer aggregate**

### Task 3: Build The Settings Usage Dashboard

**Files:**
- Modify: `src/utils/translations/settings/general.ts`
- Modify: `src/utils/translations.ts`
- Modify: `src/hooks/features/useSettingsLogic.ts`
- Modify: `src/components/settings/SettingsContent.tsx`
- Create: `src/hooks/features/useUsageStats.ts`
- Create: `src/components/settings/sections/UsageSection.tsx`

- [ ] **Step 1: Add settings tab and usage-specific translation keys**
- [ ] **Step 2: Register the new `usage` tab in settings logic**
- [ ] **Step 3: Create an async usage aggregation hook with range presets and per-model grouping**
- [ ] **Step 4: Render the new usage cards and per-model table inside `UsageSection`**
- [ ] **Step 5: Mount the section from `SettingsContent`**

### Task 4: Verify End To End

**Files:**
- Test: `src/utils/__tests__/db.version-fallback.test.ts`
- Test: `src/components/settings/SettingsContent.test.tsx`
- Test: `src/components/settings/sections/UsageSection.test.tsx`

- [ ] **Step 1: Run the focused tests**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run build`**
