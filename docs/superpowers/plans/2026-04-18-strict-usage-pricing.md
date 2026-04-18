# Strict Usage Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the log viewer to support more strictly exact model pricing for new usage records without guessing for historical records.

**Architecture:** Introduce a richer usage-record payload for exact billing dimensions, expand the pricing engine from a token-only table into model-specific exact billing rules, and add usage writers to chat, TTS, transcription, and image generation paths. Historical records stay readable and continue to show `—` unless they already satisfy exact pricing requirements.

**Tech Stack:** React 18, TypeScript, Vitest, IndexedDB-backed `dbService`, Gemini Developer API client, existing log viewer usage pipeline

---

### Task 1: Lock The Strict Pricing Contract With Tests

**Files:**
- Modify: `src/utils/usagePricing.test.ts`
- Modify: `src/services/logService.test.ts`
- Create: `src/services/api/generation/audioPricingUsage.test.ts`
- Create: `src/services/api/generation/imagePricingUsage.test.ts`

- [ ] **Step 1: Add failing pricing tests for legacy unsupported records, exact new-format records, and mixed-availability aggregates**
- [ ] **Step 2: Add failing log-service tests that require exact billing metadata to be persisted alongside current token totals**
- [ ] **Step 3: Add failing TTS/transcription usage tests proving audio paths emit strict billing records only when exact dimensions are known**
- [ ] **Step 4: Add failing image usage tests proving image generation writes exact image-count/size billing records for new requests**
- [ ] **Step 5: Run the focused suites and confirm they fail for missing pricing metadata support**

### Task 2: Evolve The Usage Record Schema Safely

**Files:**
- Modify: `src/utils/db.ts`
- Modify: `src/services/logService.ts`
- Modify: `src/hooks/features/useUsageStats.ts`

- [ ] **Step 1: Extend `ApiUsageRecord` with additive exact-pricing metadata fields and keep old fields intact**
- [ ] **Step 2: Teach `recordTokenUsage` to accept and persist the richer strict-pricing payload**
- [ ] **Step 3: Keep existing aggregate token counts stable in `useUsageStats` while passing exact metadata into pricing**
- [ ] **Step 4: Run the log-service and usage-stat tests to confirm compatibility with legacy records**

### Task 3: Rebuild The Pricing Engine Around Exact Billing Rules

**Files:**
- Modify: `src/utils/usagePricing.ts`
- Modify: `src/utils/usagePricing.test.ts`

- [ ] **Step 1: Replace the single token-only map with a model-rule registry covering token, modality-split, TTS, and image-per-output billing**
- [ ] **Step 2: Make the calculator return `null` whenever any required exact billing dimension is absent**
- [ ] **Step 3: Preserve current `gemini-3.1-pro-preview` exact pricing for legacy-compatible records**
- [ ] **Step 4: Run the pricing tests and confirm strict exact semantics hold**

### Task 4: Add Exact Usage Writers To Non-Chat Generation Paths

**Files:**
- Modify: `src/services/api/generation/audioApi.ts`
- Modify: `src/services/api/generation/imageApi.ts`
- Modify: `src/hooks/message-sender/useTtsImagenSender.ts`
- Modify: `src/hooks/message-sender/useChatStreamHandler.ts`

- [ ] **Step 1: Capture strict billing metadata from chat-stream usage and attach it to new usage records**
- [ ] **Step 2: Emit TTS usage records with exact pricing dimensions only when the API response exposes enough metadata**
- [ ] **Step 3: Emit transcription usage records under the same strict rule**
- [ ] **Step 4: Emit image-generation usage records with exact count/size metadata for Imagen and Gemini image flows**
- [ ] **Step 5: Run focused sender/API tests to verify the new records**

### Task 5: Update The UI And Docs For Historical Compatibility

**Files:**
- Modify: `src/components/log-viewer/UsageOverviewTab.tsx`
- Modify: `src/utils/translations/settings/general.ts`
- Modify: `README.md`

- [ ] **Step 1: Keep the current `—` display for any aggregate containing non-priceable records**
- [ ] **Step 2: Update the strict-pricing note so users understand new records may be exact while old ones stay unavailable**
- [ ] **Step 3: Document which model families now support exact pricing and which remain blocked by telemetry**
- [ ] **Step 4: Run the relevant UI tests plus full verification (`npm test`, `npm run typecheck`, `npm run build`)**
