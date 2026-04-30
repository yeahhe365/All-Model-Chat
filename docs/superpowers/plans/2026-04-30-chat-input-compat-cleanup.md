# Chat Input Compatibility Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining chat-input reducer setter compatibility layer and old queued/live view-slice access without changing composer behavior.

**Architecture:** Keep `useChatInput` as the integration facade. Expose explicit reducer action helpers from `useChatInputState`, pass narrow action callbacks to sub-hooks, and enforce focused view hooks for queued submission and live status reads.

**Tech Stack:** React 18, TypeScript, Vitest, existing chat input hooks and context.

---

### Task 1: Regression Tests

**Files:**
- Modify: `src/hooks/chat-input/chatInputStateMachine.test.ts`
- Modify: `src/components/chat/input/ChatInputViewContext.test.tsx`

- [ ] **Step 1: Write failing source-level compatibility cleanup tests**

Add tests that read the relevant source files and assert old compatibility names are gone:

```ts
it('keeps reducer flags behind explicit chat input actions', () => {
  const source = readFileSync(new URL('./useChatInputState.ts', import.meta.url), 'utf8');

  expect(source).not.toContain('setIsTranslating');
  expect(source).not.toContain('setIsAddingById');
  expect(source).not.toContain('setIsWaitingForUpload');
  expect(source).not.toContain('setIsFullscreen');
  expect(source).toContain('setTranslating');
  expect(source).toContain('setAddingById');
  expect(source).toContain('setWaitingForUpload');
  expect(source).toContain('exitFullscreen');
});
```

```ts
it('keeps queued and live status access behind focused hooks', () => {
  const source = readFileSync(new URL('./ChatInputArea.tsx', import.meta.url), 'utf8');

  expect(source).toContain('useQueuedSubmissionView()');
  expect(source).toContain('useLiveStatusView()');
  expect(source).not.toMatch(/queuedSubmissionProps[\\s\\S]*= useChatInputView\\(\\)/);
  expect(source).not.toMatch(/liveStatusProps[\\s\\S]*= useChatInputView\\(\\)/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts src/components/chat/input/ChatInputViewContext.test.tsx`

Expected: FAIL because `useChatInputState.ts` still exposes `setIs...` compatibility fields.

### Task 2: State Action API

**Files:**
- Modify: `src/hooks/chat-input/useChatInputState.ts`
- Modify: `src/hooks/chat-input/useChatInputTranslation.ts`
- Modify: `src/hooks/chat-input/useChatInputFile.ts`
- Modify: `src/hooks/chat-input/useMessageQueue.ts`
- Modify: `src/hooks/chat-input/useChatInputSubmission.ts`
- Modify: `src/hooks/chat-input/useChatInput.ts`

- [ ] **Step 1: Replace compatibility setters in `useChatInputState`**

Expose explicit action helpers:

```ts
const setTranslating = useCallback((value: ChatInputBooleanUpdate) => setMachineFlag('isTranslating', value), [setMachineFlag]);
const setAddingById = useCallback((value: ChatInputBooleanUpdate) => setMachineFlag('isAddingById', value), [setMachineFlag]);
const setWaitingForUpload = useCallback((value: ChatInputBooleanUpdate) => setMachineFlag('isWaitingForUpload', value), [setMachineFlag]);
const startSendAnimation = useCallback(() => setMachineFlag('isAnimatingSend', true), [setMachineFlag]);
const stopSendAnimation = useCallback(() => setMachineFlag('isAnimatingSend', false), [setMachineFlag]);
const exitFullscreen = useCallback(() => setMachineFlag('isFullscreen', false), [setMachineFlag]);
```

Return these names instead of `setIsTranslating`, `setIsAddingById`, `setIsWaitingForUpload`, and `setIsFullscreen`.

- [ ] **Step 2: Update sub-hook parameters**

Rename the narrow dependencies:

```ts
setIsTranslating -> setTranslating
setIsAddingById -> setAddingById
setIsWaitingForUpload -> setWaitingForUpload
setIsFullscreen(false) -> exitFullscreen()
setIsAnimatingSend(true) -> startSendAnimation()
setIsAnimatingSend(false) -> stopSendAnimation()
```

- [ ] **Step 3: Run state and chat input tests**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts src/components/chat/input/ChatInput.test.tsx`

Expected: PASS.

### Task 3: View Context Cleanup

**Files:**
- Modify: `src/components/chat/input/ChatInputViewContext.test.tsx`
- Modify: `src/components/chat/input/ChatInput.test.tsx`
- Check: `src/components/chat/input/ChatInputArea.tsx`

- [ ] **Step 1: Remove old test access patterns**

Keep tests using `useQueuedSubmissionView` and `useLiveStatusView` for status slices. In the mocked `ChatInputArea`, continue to use `useChatInputView` only for broad form/input/action/file props.

- [ ] **Step 2: Run focused view tests**

Run: `npm test -- src/components/chat/input/ChatInputViewContext.test.tsx src/components/chat/input/ChatInput.test.tsx`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 2: Run focused regression suite**

Run: `npm test -- src/hooks/chat-input/chatInputStateMachine.test.ts src/components/chat/input/ChatInputViewContext.test.tsx src/components/chat/input/ChatInput.test.tsx`

Expected: PASS.
