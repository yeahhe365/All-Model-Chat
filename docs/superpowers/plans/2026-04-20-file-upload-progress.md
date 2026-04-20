# File Upload Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real upload progress, upload speed, and a separate Gemini processing stage for File API uploads.

**Architecture:** Keep upload-state bookkeeping in the existing file uploader flow. Replace the SDK upload helper with a resumable HTTP upload transport that can emit browser progress events, then teach the selected-file card to render percentage, speed, and a post-upload processing stage without inventing fake backend percentages.

**Tech Stack:** React 18, TypeScript, Vitest, Gemini Files API, XMLHttpRequest

---

### Task 1: Lock the new behavior with failing tests

**Files:**
- Modify: `src/services/api/fileApi.test.ts`
- Modify: `src/components/chat/input/SelectedFileDisplay.test.tsx`

- [ ] **Step 1: Add a file API test that expects progress callbacks during the byte upload phase**
- [ ] **Step 2: Add a selected-file card test that expects upload percent and speed text for `uploading` files**
- [ ] **Step 3: Add a selected-file card test that expects a Gemini processing label for `processing_api` files**
- [ ] **Step 4: Run `npm test -- src/services/api/fileApi.test.ts src/components/chat/input/SelectedFileDisplay.test.tsx` and confirm the new assertions fail for the expected reasons**

### Task 2: Replace SDK upload with resumable HTTP upload

**Files:**
- Modify: `src/services/api/baseApi.ts`
- Modify: `src/services/api/fileApi.ts`

- [ ] **Step 1: Expose a small helper that resolves the normalized Gemini base URL from app settings**
- [ ] **Step 2: Implement the resumable start request for `upload/v1beta/files`**
- [ ] **Step 3: Upload file bytes with `XMLHttpRequest`, wiring upload progress and abort handling**
- [ ] **Step 4: Preserve the returned Gemini file resource shape expected by the rest of the app**
- [ ] **Step 5: Run `npm test -- src/services/api/fileApi.test.ts`**

### Task 3: Surface the staged upload state in the file card UI

**Files:**
- Modify: `src/components/chat/input/SelectedFileDisplay.tsx`
- Modify: `src/hooks/file-upload/uploadFileItem.ts` (only if state shaping needs tightening)

- [ ] **Step 1: Render a compact progress bar on selected-file cards while `uploadState === 'uploading'`**
- [ ] **Step 2: Show percentage and speed text during upload**
- [ ] **Step 3: Show a dedicated `Processing on Gemini` label after upload completes but before activation**
- [ ] **Step 4: Keep cancel, error, and active states visually intact**
- [ ] **Step 5: Run `npm test -- src/components/chat/input/SelectedFileDisplay.test.tsx src/hooks/file-upload/uploadFileItem.test.ts`**

### Task 4: Verify the integrated flow

**Files:**
- Modify: none unless verification exposes gaps

- [ ] **Step 1: Run `npm test -- src/services/api/fileApi.test.ts src/components/chat/input/SelectedFileDisplay.test.tsx src/hooks/file-upload/uploadFileItem.test.ts`**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npx eslint src/services/api/baseApi.ts src/services/api/fileApi.ts src/components/chat/input/SelectedFileDisplay.tsx src/components/chat/input/SelectedFileDisplay.test.tsx src/services/api/fileApi.test.ts src/hooks/file-upload/uploadFileItem.ts`**
- [ ] **Step 4: Summarize any residual risk around proxy environments or browser upload APIs**
