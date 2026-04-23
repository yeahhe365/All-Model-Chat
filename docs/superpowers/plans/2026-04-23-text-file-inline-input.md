# Text File Inline Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selected-file card action that converts a text attachment into textarea content and removes that attachment from the composer.

**Architecture:** Keep the new UI affordance on `SelectedFileDisplay`, thread the callback through the existing chat input view model, and centralize file-text resolution in the chat input hook layer. Cover the behavior with one UI-focused card test, one integration-style composer test, and one focused text-resolution helper test.

**Tech Stack:** React 18, TypeScript, Vitest, jsdom, Tailwind utility classes

---

### Task 1: Lock the selected-file card affordance with tests

**Files:**
- Modify: `src/components/chat/input/SelectedFileDisplay.test.tsx`

- [ ] Add a test that renders an active text file card with a conversion callback and expects a `Move text to input` control to appear.
- [ ] Add a test that renders a non-text file card with the same callback and expects no such control.
- [ ] Run `npm test -- src/components/chat/input/SelectedFileDisplay.test.tsx` and confirm the new expectations fail before implementation.

### Task 2: Lock the composer wiring with a failing integration test

**Files:**
- Modify: `src/components/chat/input/ChatInput.test.tsx`

- [ ] Extend the mocked `ChatInputArea` test double so it can trigger the new file-card conversion callback from `fileDisplayProps`.
- [ ] Add a test that provides a selected text file, clicks the conversion control, expects the textarea value to become the file text, and asserts `setSelectedFiles` receives an updater that removes only that file.
- [ ] Run `npm test -- src/components/chat/input/ChatInput.test.tsx` and confirm the new test fails before implementation.

### Task 3: Lock text resolution fallback order with a failing helper test

**Files:**
- Create: `src/hooks/chat-input/textFileToInput.test.ts`

- [ ] Add tests that prove text resolution prefers `textContent`, falls back to `rawFile`, then falls back to `dataUrl`, and rejects when no source can be read.
- [ ] Run `npm test -- src/hooks/chat-input/textFileToInput.test.ts` and confirm the new helper tests fail before implementation.

### Task 4: Implement the text-file conversion flow

**Files:**
- Create: `src/hooks/chat-input/textFileToInput.ts`
- Modify: `src/hooks/chat-input/useChatInputFileUi.ts`
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: `src/components/chat/input/ChatInputViewContext.tsx`
- Modify: `src/components/chat/input/ChatInputArea.tsx`
- Modify: `src/components/chat/input/area/ChatFilePreviewList.tsx`
- Modify: `src/components/chat/input/SelectedFileDisplay.tsx`

- [ ] Implement a helper that resolves uploaded text from `textContent`, `rawFile`, or `dataUrl`.
- [ ] Add a `handleMoveTextFileToInput` callback in the chat input file UI hook that resolves text, clears prior file errors, replaces textarea content, removes the converted file, focuses the textarea, and reports failures through `setAppFileError`.
- [ ] Thread the new callback through the chat input view model and file preview list into `SelectedFileDisplay`.
- [ ] Render a compact text-only action button on selected text file cards when the file is active and stable.

### Task 5: Verify the targeted surface

**Files:**
- Test: `src/components/chat/input/SelectedFileDisplay.test.tsx`
- Test: `src/components/chat/input/ChatInput.test.tsx`
- Test: `src/hooks/chat-input/textFileToInput.test.ts`

- [ ] Run `npm test -- src/components/chat/input/SelectedFileDisplay.test.tsx src/components/chat/input/ChatInput.test.tsx src/hooks/chat-input/textFileToInput.test.ts`.
- [ ] If the targeted tests pass, report the exact command and pass counts before claiming completion.
