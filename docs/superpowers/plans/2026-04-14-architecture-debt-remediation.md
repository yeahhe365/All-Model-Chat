# Architecture Debt Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the largest current architecture bottlenecks by adding real chat-path E2E coverage, eliminating translation prop drilling, flattening the chat-input orchestration hook tree, and splitting persisted file payloads out of session records.

**Architecture:** Protect the highest-risk user flows first with browser tests, then replace cross-tree `t` prop threading with a single I18n context so later refactors can shrink component interfaces safely. Flatten chat-input orchestration by keeping effectful logic in `useChatInput` and moving shared pure helpers to utility modules. Finally, migrate IndexedDB persistence so session records contain lightweight file references while blobs live in a dedicated `files` object store with backward-compatible rehydration.

**Tech Stack:** React 18, TypeScript, Zustand, IndexedDB, Vitest, Playwright, Vite

---

### Task 1: Expand Core Chat E2E Coverage

**Files:**
- Modify: `e2e/chat-smoke.spec.ts`
- Create: `e2e/chat-core.spec.ts`
- Modify: `playwright.config.ts`

- [x] Add a browser test that boots the app with seeded local state, sends a plain text prompt through the chat UI, and verifies a mocked streamed model reply renders.
- [x] Add a browser test that intercepts the core text-generation network path with `page.route(...)` and verifies the message list updates incrementally or at least completes with the mocked content.
- [x] Reuse the existing browser-seeding utilities from `chat-smoke.spec.ts` where possible instead of re-seeding state in multiple incompatible ways.
- [x] Run `npm run test:e2e -- e2e/chat-core.spec.ts` and make the new test fail for the intended missing behavior before support changes.
- [x] Implement the minimal Playwright or test-seeding helpers needed to make the new browser tests pass.
- [x] Re-run `npm run test:e2e -- e2e/chat-smoke.spec.ts e2e/chat-core.spec.ts`.

### Task 2: Introduce Global I18n Context

**Files:**
- Create: `src/contexts/I18nContext.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/app/useApp.ts`
- Modify: `src/components/layout/ChatArea.tsx`
- Modify: `src/components/layout/chat-area/ChatAreaContext.tsx`
- Modify: `src/components/layout/chat-area/ChatAreaProps.ts`
- Modify: `src/components/header/Header.tsx`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: component and hook files that currently only receive `t` via props/context but can read it directly

- [x] Create an I18n provider/hook that exposes `{ language, t }` globally and memoizes the translator from the current app language.
- [x] Wrap the app tree with that provider so all windows/portals still receive the same translation source of truth.
- [x] Remove `t` from ChatArea context slices and top-level ChatArea prop models, then update leaf components to call `useI18n()` directly.
- [x] Remove `t` from ChatInput, MessageList, Header, modal, sidebar, and settings component props where those props only exist for translation lookups.
- [x] Run `npm run typecheck` after each batch and keep the public prop interfaces shrinking rather than growing.
- [x] Add or update at least one focused test proving that language changes still update UI text without full-page reload assumptions.

### Task 3: Flatten Chat Input Hook Orchestration

**Files:**
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/hooks/chat-input/useChatInputEffects.ts`
- Modify: `src/hooks/chat-input/useChatInputModals.ts`
- Modify: `src/hooks/chat-input/useChatInputLocalState.ts`
- Modify: `src/hooks/chat-input/useChatInputState.ts`
- Modify: `src/components/chat/input/ChatInput.tsx`
- Create or modify: helper modules under `src/hooks/chat-input/` when pure logic extraction is justified

- [x] Move effectful orchestration that is only used by `useChatInput` back into the main hook so the domain flow is readable in one place.
- [x] Keep only focused reusable subunits that own true local state boundaries or pure helper logic.
- [x] Reduce long parameter lists by passing narrower domain objects or extracting pure helper functions instead of routing everything through wrapper hooks.
- [x] Re-run the existing `chatInputUtils` and pending-submission tests while refactoring.
- [x] Add focused tests for any extracted pure helper that replaces current wrapper behavior.

### Task 4: Split Session Files Into Dedicated IndexedDB Storage

**Files:**
- Modify: `src/utils/db.ts`
- Modify: `src/types/chat.ts`
- Modify: `src/utils/chat/session.ts`
- Modify: `src/hooks/chat/history/useSessionLoader.ts`
- Modify: `src/stores/chatStore.ts`
- Modify: `src/hooks/data-management/useDataExport.ts`
- Modify: `src/hooks/data-management/useChatSessionExport.ts`
- Modify: tests under `src/utils/__tests__/db.test.ts`, `src/utils/chat/__tests__/session.test.ts`, and store/history tests

- [x] Add a dedicated IndexedDB `files` object store and a forward migration that preserves compatibility with existing databases.
- [x] Store durable file blobs and metadata in that new store while keeping session records lightweight through file references.
- [x] Rehydrate message files by resolving file references on session load, including backward-compatible fallback for legacy embedded payloads.
- [x] Ensure exports still strip non-serializable fields and remain portable even though runtime persistence now uses detached file records.
- [x] Add/update tests for migrations, save/load round-trips, and legacy-session rehydration.
- [x] Validate that chat history loading still works when sessions contain multiple media files.

### Task 5: Final Verification

**Files:**
- Modify: `README.md` only if new test commands or storage behavior need documentation

- [x] Run `npm run test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test:e2e -- e2e/chat-smoke.spec.ts e2e/chat-core.spec.ts`.
- [x] Summarize remaining known risk around real external APIs versus mocked browser coverage.

## Status Notes

- Core chat browser coverage now exists through Playwright smoke plus mocked non-streaming and streaming chat flows, translation lookups come from `I18nProvider`, and IndexedDB persistence uses a dedicated `files` store with backward-compatible session rehydration.
- The main remaining validation gap is behavior that still depends on real external APIs or device/browser media subsystems rather than deterministic mocks.
