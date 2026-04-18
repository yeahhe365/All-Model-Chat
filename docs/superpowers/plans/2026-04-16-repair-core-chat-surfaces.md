# Core Chat Surface Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the five identified chat-surface reliability and maintainability issues without changing persisted data contracts.

**Architecture:** Keep app-wide context and persistence APIs stable, then add narrow internal seams: local view context for chat input composition, worker lifecycle reset helpers for Pyodide, explicit audio-queue reset hooks for Live API, TTL-based cleanup in streaming storage, and shared docx extraction for preview and preprocessing.

**Tech Stack:** React 18, TypeScript, Vitest, Vite, Web Workers, mammoth (worker-loaded), IndexedDB-backed local state

---

### Task 1: Streaming Store Garbage Collection

**Files:**
- Modify: `src/services/streamingStore.ts`
- Modify: `src/hooks/ui/useMessageStream.test.tsx`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the streaming-store tests to verify the new cases fail**
- [ ] **Step 3: Add timestamp/listener-aware GC with minimal API surface**
- [ ] **Step 4: Re-run the streaming-store tests to verify they pass**

### Task 2: Pyodide Worker Recovery

**Files:**
- Modify: `src/services/pyodideService.ts`
- Modify: `src/services/pyodideService.test.ts`

- [ ] **Step 1: Write failing tests for timeout reset, worker fatal reset, and concurrent execution rejection**
- [ ] **Step 2: Run the Pyodide tests to verify the new cases fail**
- [ ] **Step 3: Implement worker lifecycle reset and request coordination**
- [ ] **Step 4: Re-run the Pyodide tests to verify they pass**

### Task 3: Live API Audio Queue Reset

**Files:**
- Modify: `src/hooks/live-api/useLiveMessageProcessing.ts`
- Modify: `src/hooks/live-api/useLiveConnection.ts`
- Modify: `src/hooks/live-api/useLiveMessageProcessing.test.tsx`
- Modify: `src/hooks/live-api/useLiveConnection.test.tsx`

- [ ] **Step 1: Write failing tests for unexpected close/error queue reset and reconnect cleanup**
- [ ] **Step 2: Run the Live API tests to verify the new cases fail**
- [ ] **Step 3: Implement explicit buffered-audio reset wiring**
- [ ] **Step 4: Re-run the Live API tests to verify they pass**

### Task 4: Chat Input Composition Split

**Files:**
- Create: `src/components/chat/input/ChatInputViewContext.tsx`
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: `src/components/chat/input/ChatInputArea.tsx`
- Modify: `src/components/chat/input/ChatInputFileModals.tsx`
- Modify: `src/components/layout/chat-area/ChatAreaContext.test.tsx`

- [ ] **Step 1: Write a failing structural test that proves the local view provider is required and stable**
- [ ] **Step 2: Run the focused chat-area/chat-input tests to verify the new case fails**
- [ ] **Step 3: Introduce local chat-input view context and remove the giant final prop handoff**
- [ ] **Step 4: Re-run the focused tests to verify they pass**

### Task 5: Docx Preview Support

**Files:**
- Create: `src/utils/docxPreview.ts`
- Modify: `src/hooks/file-upload/useFilePreProcessing.ts`
- Modify: `src/components/modals/FilePreviewModal.tsx`
- Modify: `src/components/shared/file-preview/TextFileViewer.tsx`
- Create or Modify: `src/components/modals/FilePreviewModal.test.tsx`

- [ ] **Step 1: Write failing tests for `.docx` preview loading and error fallback**
- [ ] **Step 2: Run the preview tests to verify the new cases fail**
- [ ] **Step 3: Add shared docx text extraction and hook preview into it**
- [ ] **Step 4: Re-run the preview tests to verify they pass**

### Task 6: Full Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-repair-core-chat-surfaces-design.md`
- Modify: `docs/superpowers/plans/2026-04-16-repair-core-chat-surfaces.md`

- [ ] **Step 1: Run `npm run typecheck`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm test`**
- [ ] **Step 4: Review git diff for Blob URL safety and unintended persistence changes**
