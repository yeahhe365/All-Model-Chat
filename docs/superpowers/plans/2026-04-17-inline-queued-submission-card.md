# Inline Queued Submission Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single queued submission card inside the chat composer so users can stage the next prompt while a response is still generating and have it auto-send once generation finishes.

**Architecture:** Extend the existing chat-input pending submission flow with a dedicated queued-send snapshot for response-in-progress cases, render that snapshot as an inline card above the textarea, and expose a lightweight queue action next to the main send controls. Reuse current send logic so the queued prompt still flows through the standard message sender.

**Tech Stack:** React 18, Zustand-backed app state, Vitest, Tailwind CSS

---

### Task 1: Lock Queue Behavior With Tests

**Files:**
- Modify: `src/hooks/chat-input/pendingSubmissionUtils.test.ts`
- Modify: `src/components/chat/input/ChatInput.test.tsx`

- [ ] **Step 1: Add a failing queued snapshot utility test**
- [ ] **Step 2: Run `npm test -- src/hooks/chat-input/pendingSubmissionUtils.test.ts` and confirm it fails**
- [ ] **Step 3: Add failing chat-input tests for queueing and restoring**
- [ ] **Step 4: Run `npm test -- src/components/chat/input/ChatInput.test.tsx` and confirm they fail**

### Task 2: Implement The Inline Queue Flow

**Files:**
- Modify: `src/hooks/chat-input/pendingSubmissionUtils.ts`
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: `src/components/chat/input/ChatInputViewContext.tsx`
- Modify: `src/components/chat/input/ChatInputArea.tsx`
- Modify: `src/components/chat/input/ChatInputActions.tsx`
- Modify: `src/components/chat/input/actions/SendControls.tsx`
- Modify: `src/components/chat/input/actions/UtilityControls.tsx`
- Modify: `src/components/chat/input/actions/SendControls.tsx`
- Modify: `src/types/chat.ts`
- Create: `src/components/chat/input/QueuedSubmissionCard.tsx`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Add a queued submission snapshot type and builder helper**
- [ ] **Step 2: Manage one queued submission inside `useChatInput`**
- [ ] **Step 3: Add queue button props to input actions and render them**
- [ ] **Step 4: Add the inline queued submission card above the textarea**
- [ ] **Step 5: Auto-flush the queued submission when `isLoading` transitions from true to false**

### Task 3: Verify The Composer Flow

**Files:**
- Test: `src/hooks/chat-input/pendingSubmissionUtils.test.ts`
- Test: `src/components/chat/input/ChatInput.test.tsx`

- [ ] **Step 1: Run `npm test -- src/hooks/chat-input/pendingSubmissionUtils.test.ts src/components/chat/input/ChatInput.test.tsx`**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run build`**
