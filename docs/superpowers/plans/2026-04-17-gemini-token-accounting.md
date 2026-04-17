# Gemini Token Accounting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Gemini token preflight counts and persisted usage totals match the effective request shape and the detailed usage buckets returned by the API.

**Architecture:** Keep the existing chat flow, but stop treating token usage as only prompt plus completion. Count tokens with the same request configuration used for generation, persist the additional Gemini buckets we need for correct accounting, and aggregate UI totals from billable input/output buckets instead of reverse-engineering them from a single total.

**Tech Stack:** React, TypeScript, Vitest, IndexedDB, `@google/genai`

---

### Task 1: Lock in token-shape expectations with failing tests

**Files:**
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/services/api/generation/tokenApi.test.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/utils/__tests__/modelHelpers.test.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/services/logService.test.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/components/settings/sections/UsageSection.test.tsx`

- [ ] **Step 1: Write failing tests for request-shaped counting and expanded bucket extraction**
- [ ] **Step 2: Run the targeted Vitest files and confirm the new assertions fail for the current implementation**

### Task 2: Pass the tests with minimal production changes

**Files:**
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/services/api/generation/tokenApi.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/hooks/features/useTokenCountLogic.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/components/chat/input/ChatInputFileModals.tsx`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/utils/modelHelpers.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/services/logService.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/utils/db.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/hooks/message-sender/useChatStreamHandler.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/components/message/PerformanceMetrics.tsx`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/hooks/features/useUsageStats.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/utils/usagePricing.ts`
- Modify: `/Users/jones/Documents/Code/All-Model-Chat/src/components/log-viewer/TokenUsageTab.tsx`

- [ ] **Step 1: Thread the current chat settings into token preflight and pass countTokens config that mirrors generation**
- [ ] **Step 2: Normalize Gemini usage metadata into prompt/cache/tool-use/response/thought buckets without unsafe `total - prompt` fallbacks**
- [ ] **Step 3: Persist the expanded token buckets and aggregate usage tables from billable input/output totals**
- [ ] **Step 4: Expose the corrected message-level breakdown so the per-message display matches the stored totals**

### Task 3: Verify and clean up

**Files:**
- Verify only

- [ ] **Step 1: Re-run the targeted tests until all pass**
- [ ] **Step 2: Run one broader safety check (`npm test` or the narrowest sensible subset if the full suite is too slow)**
- [ ] **Step 3: Summarize any residual limitations, especially around historical records that predate the new fields**
