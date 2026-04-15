# Header MessageActions And README Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the next low-risk prop-chain redundancies and clean stale runtime documentation.

**Architecture:** Keep behavior unchanged and focus on dead fields only. Remove fields from the narrowest complete chain needed for type safety, and update README text to match the codebase's current Vite-first architecture.

**Tech Stack:** React 18, TypeScript, Vitest, ESLint, Markdown

---

### Task 1: Add Guardrail Tests

**Files:**
- Create: `src/__tests__/headerMessageActionsReadmeCleanup.test.ts`

- [x] Add a failing source guard that `Header.tsx` no longer references `onOpenSettingsModal` or `isKeyLocked`.
- [x] Add a failing source guard that `MessageActions.tsx` no longer references `onTextToSpeech` or `ttsMessageId`.
- [x] Add a failing source guard that README no longer mentions importmap/CDN runtime loading or Tailwind CDN styling as the current architecture.
- [x] Run `npm test -- src/__tests__/headerMessageActionsReadmeCleanup.test.ts`.

### Task 2: Remove Prop-Chain Redundancy And Stale README Text

**Files:**
- Modify: `src/components/header/Header.tsx`
- Modify: `src/components/layout/ChatArea.tsx`
- Modify: `src/components/layout/chat-area/ChatAreaProps.ts`
- Modify: `src/components/layout/chat-area/ChatAreaContext.tsx`
- Modify: `src/components/layout/mainContentModels.ts`
- Modify: `src/components/layout/MainContent.tsx`
- Modify: `src/components/layout/ChatArea.test.tsx`
- Modify: `src/components/message/Message.tsx`
- Modify: `src/components/message/MessageActions.tsx`
- Modify: `src/components/message/MessageActions.test.tsx`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/layout/ChatArea.tsx`
- Modify: `README.md`

- [x] Remove the unused `Header` fields from component props, upstream chat-area model types, and call sites.
- [x] Remove the unused `MessageActions` fields from component props, message props, message list context, and call sites.
- [x] Rewrite README sections that still claim importmap/CDN zero-build is part of the current runtime architecture.
- [x] Re-run `npm test -- src/__tests__/headerMessageActionsReadmeCleanup.test.ts`.

### Task 3: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-header-messageactions-readme-cleanup.md`

- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Update the status notes with the verified result.

## Status Notes

- `Header` no longer accepts or destructures the dead `onOpenSettingsModal` and `isKeyLocked` props, and the corresponding chat-area header model/types/call sites were reduced to match.
- `MessageActions` no longer accepts `onTextToSpeech` or `ttsMessageId`, and the now-dead message/message-list/context prop chain was removed with it.
- README sections that described importmap/CDN zero-build runtime ownership were rewritten to match the current Vite-first architecture, while keeping the deployment guidance focused on standard builds and hosted API options.
- New source guard coverage now lives in `src/__tests__/headerMessageActionsReadmeCleanup.test.ts`.
- `npm run typecheck` passes.
- `npm run lint` passes with `332` warnings.
- `npm test` passes with `65` files and `304` tests green.
- `npm run build` passes and keeps the earlier bundle-warning cleanup intact.
