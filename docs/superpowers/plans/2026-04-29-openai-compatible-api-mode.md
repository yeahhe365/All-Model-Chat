# OpenAI Compatible API Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global manual API mode switch so Gemini Native remains the default path while OpenAI-compatible chat can be used as a fallback.

**Architecture:** Store a global `apiMode` in app settings. Route standard chat sends through the existing Gemini service when `apiMode` is `gemini-native`, and through a small OpenAI-compatible chat client when `apiMode` is `openai-compatible`. Keep Gemini-only tools and media generation on the native path.

**Tech Stack:** React 18, Zustand settings, IndexedDB persistence, Vitest, browser `fetch` streaming.

---

### Task 1: Settings Shape

**Files:**

- Modify: `src/types/settings.ts`
- Modify: `src/constants/appConstants.ts`
- Test: `src/stores/__tests__/settingsStore.test.ts`

- [ ] Write a failing test proving the default API mode is Gemini Native.
- [ ] Add the `ApiMode` type and defaults.
- [ ] Run the focused settings tests.

### Task 2: OpenAI-Compatible Client

**Files:**

- Create: `src/services/api/openaiCompatibleApi.ts`
- Test: `src/services/api/openaiCompatibleApi.test.ts`

- [ ] Write failing tests for request URL/header/body construction.
- [ ] Write failing tests for non-stream and SSE streaming response parsing.
- [ ] Implement minimal text chat support.
- [ ] Run the focused OpenAI client tests.

### Task 3: Chat Routing

**Files:**

- Modify: `src/hooks/message-sender/useStandardChat.ts`
- Test: `src/hooks/message-sender/useStandardChat.test.tsx`

- [ ] Write a failing test proving OpenAI mode bypasses the Gemini sender.
- [ ] Add global mode branching for standard chat only.
- [ ] Keep Gemini Native behavior unchanged.
- [ ] Run the focused sender tests.

### Task 4: Settings UI

**Files:**

- Modify: `src/components/settings/sections/ApiConfigSection.tsx`
- Modify: `src/components/settings/SettingsContent.tsx`
- Modify: `src/utils/translations/settings/api.ts`
- Test: `src/components/settings/sections/ApiConfigSection.test.tsx`

- [ ] Write a failing render test for the API mode switch.
- [ ] Add the global toggle and OpenAI Base URL field.
- [ ] Run the focused settings UI tests.

### Task 5: Verification

**Files:**

- No production files.

- [ ] Run focused Vitest files touched by this change.
- [ ] Run `npm run typecheck`.
- [ ] Report exact verification evidence.
