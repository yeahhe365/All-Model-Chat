# Chat Input State Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local reducer-backed chat input state machine and move queue/live status access behind focused context hooks without changing composer behavior.

**Architecture:** Keep `useChatInput` as the integration facade, but move local composer flags into a reducer module with selectors for coarse modes. Extend `ChatInputViewContext` with focused status hooks and let `ChatInputArea` consume them at render sites.

**Tech Stack:** React 18, TypeScript, Vitest, existing context/hooks structure.

---

### Task 1: Reducer State Machine

**Files:**
- Create: `src/hooks/chat-input/chatInputStateMachine.ts`
- Test: `src/hooks/chat-input/chatInputStateMachine.test.ts`

- [x] **Step 1: Write failing reducer tests**

Cover initial state, flag actions, toggle fullscreen, mode priority (`processing` before `live`, `editing`, `queuing`, then `idle`), and queue detection from active queued submission.

- [x] **Step 2: Run reducer tests to verify they fail**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts`

- [x] **Step 3: Implement reducer and selectors**

Expose `initialChatInputMachineState`, `chatInputStateReducer`, `getChatInputMode`, `selectIsChatInputProcessing`, and compatibility action helpers.

- [x] **Step 4: Run reducer tests to verify they pass**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts`

### Task 2: Hook Compatibility Integration

**Files:**
- Modify: `src/hooks/chat-input/useChatInputState.ts`
- Test: `src/hooks/chat-input/chatInputStateMachine.test.ts`

- [x] **Step 1: Integrate reducer into `useChatInputState`**

Replace independent boolean `useState` calls for translating, send animation, add-by-id, add-by-url, waiting-for-upload, and fullscreen with reducer-backed values and setter-compatible callbacks.

- [x] **Step 2: Preserve draft state behavior**

Leave text, quotes, TTS context, input strings, refs, localStorage hydration, and cross-tab sync unchanged.

- [x] **Step 3: Run focused chat input tests**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts src/components/chat/input/ChatInput.test.tsx`

### Task 3: Focused Status Context Hooks

**Files:**
- Modify: `src/components/chat/input/ChatInputViewContext.tsx`
- Modify: `src/components/chat/input/ChatInputArea.tsx`
- Modify: `src/components/chat/input/ChatInput.test.tsx`
- Test: `src/components/chat/input/ChatInputViewContext.test.tsx`

- [x] **Step 1: Write failing context test**

Assert `useQueuedSubmissionView` and `useLiveStatusView` return their focused slices from the provider.

- [x] **Step 2: Run context test to verify it fails**

Run: `npm test -- src/components/chat/input/ChatInputViewContext.test.tsx`

- [x] **Step 3: Add focused hooks and update consumers**

Add `useQueuedSubmissionView` and `useLiveStatusView`. Update `ChatInputArea` and its mocked test version to use those hooks instead of reaching into the full view object for status rendering.

- [x] **Step 4: Run context and chat input tests**

Run: `npm test -- src/components/chat/input/ChatInputViewContext.test.tsx src/components/chat/input/ChatInput.test.tsx`

### Task 4: Final Verification

**Files:**
- Verify all files changed in Tasks 1-3.

- [x] **Step 1: Typecheck**

Run: `npm run typecheck`

- [x] **Step 2: Run focused tests**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts src/components/chat/input/ChatInputViewContext.test.tsx src/components/chat/input/ChatInput.test.tsx`
