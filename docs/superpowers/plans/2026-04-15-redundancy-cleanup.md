# Redundancy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead interfaces and leftover wrapper layers, then consolidate the remaining duplicated UI responsibilities around scrolling, preview state, export plumbing, and tooling.

**Architecture:** Keep the current React/Vite structure, but shrink prop surfaces to match actual usage, replace duplicated one-line builders with direct object assembly, centralize repeated helper logic where it already overlaps, and update tests/docs/tooling to match the real runtime shape. Behavior should stay the same unless a dead path is being removed.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, ESLint, Prettier.

---

### Task 1: Remove Low-Risk Dead Interfaces And Wrappers

**Files:**
- Modify: `src/components/layout/mainContentModels.ts`
- Modify: `src/components/layout/MainContent.tsx`
- Delete: `src/components/layout/mainContentModels.test.ts`
- Modify: `src/components/header/Header.tsx`
- Modify: `src/components/layout/ChatArea.tsx`
- Modify: `src/components/layout/chat-area/ChatAreaContext.tsx`
- Modify: `src/components/sidebar/HistorySidebar.tsx`
- Modify: `src/components/settings/sections/ApiConfigSection.tsx`
- Modify: `src/components/settings/SettingsContent.tsx`
- Modify: `src/components/settings/ModelVoiceSettings.tsx`
- Modify: `src/components/settings/controls/ModelSelector.tsx`
- Modify: `src/components/message/Message.tsx`
- Modify: `src/components/message/MessageActions.tsx`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/components/log-viewer/ConsoleTab.tsx`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/components/icons/CustomIcons.tsx`

- [x] Delete identity builders and wire direct object literals from `MainContent.tsx`.
- [x] Remove unused header/sidebar/settings props and update the full prop chain so interfaces match real consumption.
- [x] Remove message-level TTS passthrough props that no longer affect rendering.
- [x] Remove the placeholder `adjustTextareaHeight` return value, unused console refs, duplicate icon export, and stale localStorage-era constants.
- [x] Update or delete tests that only verified removed pass-through behavior.

### Task 2: Consolidate Scroll Handling

**Files:**
- Modify: `src/hooks/chat/useChatScroll.ts`
- Modify: `src/components/chat/message-list/hooks/useMessageListScroll.ts`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/layout/ChatArea.tsx`

- [x] Choose one scroll owner for the message list and remove duplicated listener/state bookkeeping.
- [x] Preserve current session scroll restoration, turn navigation, and bottom-state UI.
- [x] Update affected tests if the public props/context surface changes.

### Task 3: Consolidate Preview And Export Plumbing

**Files:**
- Modify: `src/hooks/useMessageListUI.ts`
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/hooks/useMessageExport.ts`
- Modify: `src/hooks/data-management/useChatSessionExport.ts`
- Create or modify shared helpers under `src/utils/export/` and/or `src/hooks/ui/`

- [x] Extract shared preview/config state helpers where message-list and chat-input logic currently duplicate the same responsibilities.
- [x] Extract shared export-module loading and filename/template plumbing used by both single-message and session export flows.
- [x] Keep existing modal behavior and export formats intact.

### Task 4: Tooling And Docs Sync

**Files:**
- Modify: `package.json`
- Modify: `knip.json`
- Modify: `README.md`

- [x] Enable `knip` in the actual toolchain with a runnable package script.
- [x] Update README to match the current Vite-based build/runtime structure instead of the older zero-build/importmap description.
- [x] Keep docs aligned with the resulting code surface after cleanup.

### Task 5: Verification

**Files:**
- Verify only

- [x] Run targeted tests for layout, message list, settings, and file preview/export flows if present.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.

## Status Notes

- Dead interface cleanup landed across `MainContent`, `ChatArea`, `Header`, `HistorySidebar`, message actions, settings props, and the old `mainContentModels` identity wrappers/test file.
- Scroll ownership now lives in the message-list path, with shared container refs preserved for session export and focused coverage added around restoration/navigation behavior.
- Shared file preview/config state and export runtime plumbing now live under reusable helpers (`useFileModalState`, `src/utils/export/runtime.ts`) and are consumed by both message-list and chat-input/session export flows.
- Tooling/docs sync landed via `npm run verify`, active `knip` integration, and the Vite-first README/runtime structure refresh.
- Subsequent follow-up work on `main` eliminated the remaining lint debt and test stderr noise from this batch; the current `npm run verify` passes cleanly.
