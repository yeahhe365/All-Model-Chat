# Modality Evidence Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require modality evidence for all priced models and synthesize `TEXT -> TEXT` evidence for pure-text chat requests so plain Gemini chat can price exactly under strict mode.

**Architecture:** Remove the legacy Pro fallback from the pricing engine, add a chat-specific helper that derives exact pricing metadata from proven text-only request/response structure, and keep all non-text or incomplete-evidence requests unavailable.

**Tech Stack:** React 18, TypeScript, Vitest, existing log viewer usage pipeline, Gemini Developer API client

---

### Task 1: Lock The New Strict Contract With Tests

**Files:**
- Modify: `src/utils/usagePricing.test.ts`
- Create: `src/utils/chatPricingEvidence.test.ts`

- [ ] **Step 1: Add a failing test proving legacy `gemini-3.1-pro-preview` records without `exactPricing` now return `null`**
- [ ] **Step 2: Add failing tests for pure-text Flash and Pro chat evidence synthesis**
- [ ] **Step 3: Add a failing test showing mixed/file-backed chat requests do not synthesize text-only evidence**
- [ ] **Step 4: Run the focused suites and confirm they fail for the expected reasons**

### Task 2: Implement Pure-Text Evidence Synthesis

**Files:**
- Create: `src/utils/chatPricingEvidence.ts`
- Modify: `src/hooks/message-sender/useChatStreamHandler.ts`

- [ ] **Step 1: Implement a helper that inspects outbound request parts and final response parts for proven text-only structure**
- [ ] **Step 2: Wire the helper into chat-stream completion so text-only requests store synthesized exact pricing metadata**
- [ ] **Step 3: Re-run the focused evidence tests and confirm they pass**

### Task 3: Remove The Legacy Pro Fallback

**Files:**
- Modify: `src/utils/usagePricing.ts`
- Modify: `src/hooks/features/useUsageStats.ts`

- [ ] **Step 1: Remove fallback pricing from records that lack exact evidence**
- [ ] **Step 2: Keep all UI aggregates using `calculateApiUsageRecordPriceUsd` so evidence-only pricing applies uniformly**
- [ ] **Step 3: Re-run the pricing tests and confirm all models now obey the same strict rule**

### Task 4: Update Copy And Verify

**Files:**
- Modify: `src/utils/translations/settings/general.ts`
- Modify: `README.md`

- [ ] **Step 1: Update strict-pricing copy to mention provider metadata or proven local text-only evidence**
- [ ] **Step 2: Run full verification: `npm test`, `npm run typecheck`, `npm run build`**
