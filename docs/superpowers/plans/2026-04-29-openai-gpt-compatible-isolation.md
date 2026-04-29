# OpenAI GPT-Compatible Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OpenAI Compatible mode target GPT/OpenAI-compatible chat without mutating Gemini Native API settings.

**Architecture:** Keep `gemini-native` and `openai-compatible` as separate runtime branches. Add a dedicated OpenAI-compatible API key setting and make OpenAI mode resolve keys from that setting while Gemini Native continues to use the existing Gemini API key/proxy settings. Keep the OpenAI-compatible request body free of Gemini-native `extra_body.google` fields.

**Tech Stack:** React 18, Zustand settings, IndexedDB settings persistence, Vitest, browser `fetch` streaming.

---

### Task 1: Settings Isolation

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/constants/appConstants.ts`
- Modify: `src/utils/apiUtils.ts`
- Test: `src/stores/__tests__/settingsStore.test.ts`

- [x] Add `openaiCompatibleApiKey` to `AppSettings`.
- [x] Default it to `null`.
- [x] Resolve OpenAI-compatible requests from `openaiCompatibleApiKey` instead of `apiKey`.
- [x] Verify Gemini Native still resolves `apiKey`.

### Task 2: Settings UI Isolation

**Files:**
- Modify: `src/components/settings/sections/api-config/ApiKeyInput.tsx`
- Modify: `src/components/settings/sections/ApiConfigSection.tsx`
- Test: `src/components/settings/sections/ApiConfigSection.test.tsx`

- [x] Show the OpenAI-compatible API key field when OpenAI Compatible mode is selected.
- [x] Keep the existing Gemini API key field bound to `apiKey`.
- [x] Test that editing the OpenAI key calls `onUpdate('openaiCompatibleApiKey', value)` and does not call `setApiKey`.

### Task 3: OpenAI-Compatible Request Safety

**Files:**
- Modify: `src/services/api/openaiCompatibleApi.ts`
- Test: `src/services/api/openaiCompatibleApi.test.ts`
- Test: `src/hooks/message-sender/useStandardChat.test.tsx`

- [x] Keep the request body limited to OpenAI/GPT-safe chat-completions fields.
- [x] Add tests proving Gemini-native fields are not emitted in OpenAI-compatible mode.
- [x] Verify OpenAI-compatible mode routes through the OpenAI-compatible client and Gemini Native routes through Gemini services.

### Task 4: Verification

**Files:**
- No production files.

- [x] Run focused Vitest files touched by this change.
- [x] Run `npm run typecheck`.
- [x] Report exact verification output.
