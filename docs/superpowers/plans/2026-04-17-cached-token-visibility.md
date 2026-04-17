# Cached Token Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface cached token hits in the settings usage dashboard and under model message bubbles using Gemini usage metadata.

**Architecture:** Extend token extraction to capture `cachedContentTokenCount`, persist that value alongside usage records, aggregate it in the settings usage hook, and render it in both the settings dashboard and message performance footer. Keep pricing in strict-official mode: cached-hit requests only show a price when the currently stored fields are enough to reconstruct the exact official charge.

**Tech Stack:** React 18, IndexedDB, Vitest, Gemini usage metadata

---

### Task 1: Lock Cached Token Extraction And Rendering With Tests

**Files:**
- Modify: `src/utils/__tests__/modelHelpers.test.ts`
- Modify: `src/services/logService.test.ts`
- Modify: `src/components/settings/sections/UsageSection.test.tsx`
- Create: `src/components/message/PerformanceMetrics.test.tsx`

- [ ] **Step 1: Add a failing token extraction test for cached token count**
- [ ] **Step 2: Add a failing log service test that persists cached prompt tokens**
- [ ] **Step 3: Add a failing usage section test for cached token totals**
- [ ] **Step 4: Add a failing performance metrics test for cached token display**
- [ ] **Step 5: Run the focused tests and confirm they fail**

### Task 2: Implement Cached Token Data Flow

**Files:**
- Modify: `src/utils/modelHelpers.ts`
- Modify: `src/types/chat.ts`
- Modify: `src/utils/db.ts`
- Modify: `src/services/logService.ts`
- Modify: `src/hooks/message-sender/useChatStreamHandler.ts`
- Modify: `src/hooks/chat-stream/processors.ts`
- Modify: `src/hooks/features/useUsageStats.ts`
- Modify: `src/utils/usagePricing.ts`
- Modify: `src/components/settings/sections/UsageSection.tsx`
- Modify: `src/utils/translations/settings/general.ts`
- Modify: `src/components/message/PerformanceMetrics.tsx`

- [ ] **Step 1: Capture `cachedContentTokenCount` from Gemini usage metadata**
- [ ] **Step 2: Persist cached prompt tokens in usage records and finished chat messages**
- [ ] **Step 3: Aggregate cached token totals in the usage hook**
- [ ] **Step 4: Render cached token totals in settings and bubble footer**
- [ ] **Step 5: Keep strict pricing unavailable when cached-hit records cannot be priced exactly**

### Task 3: Verify End To End

**Files:**
- Test: `src/utils/__tests__/modelHelpers.test.ts`
- Test: `src/services/logService.test.ts`
- Test: `src/components/settings/sections/UsageSection.test.tsx`
- Test: `src/components/message/PerformanceMetrics.test.tsx`

- [ ] **Step 1: Run the focused tests**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run build`**
