# Chat Area Context Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining `MainContent -> ChatArea -> MessageList / ChatInput` prop-drilling chain by introducing focused chat-area context slices without changing chat behavior.

**Architecture:** `MainContent` passes one coarse chat-area root model into `ChatArea`. `ChatArea` owns a provider that publishes smaller memoized slices for `MessageList` and `ChatInput`, while `Header` stays on direct props for this batch.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest

---

### Task 1: Lock the Provider Boundary with Tests

**Files:**
- Create: `src/components/layout/chat-area/ChatAreaContext.test.tsx`
- Create: `src/components/layout/chat-area/ChatAreaContext.tsx`

- [ ] **Step 1: Write a failing provider guard test**

```tsx
it('throws when a chat-area slice hook is used outside the provider', () => {
  expect(() => renderHookConsumerWithoutProvider()).toThrow(
    /ChatAreaProvider/
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: FAIL because `ChatAreaContext` hooks do not exist yet.

- [ ] **Step 3: Write a failing slice exposure test**

```tsx
it('exposes the message-list and chat-input slices from one root model', () => {
  render(<Harness />);
  expect(screen.getByTestId('message-count')).toHaveTextContent('2');
  expect(screen.getByTestId('input-model')).toHaveTextContent('gemini-2.5-pro');
});
```

- [ ] **Step 4: Implement the provider and hooks**

```tsx
export const ChatAreaProvider = ({ value, children }: Props) => (
  <ChatAreaRootContext.Provider value={value.root}>
    <ChatAreaMessageListContext.Provider value={value.messageList}>
      <ChatAreaInputContext.Provider value={value.input}>
        {children}
      </ChatAreaInputContext.Provider>
    </ChatAreaMessageListContext.Provider>
  </ChatAreaRootContext.Provider>
);
```

- [ ] **Step 5: Run the provider test again**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: PASS

### Task 2: Move ChatArea to a Provider-Owned Boundary

**Files:**
- Modify: `src/components/layout/ChatArea.tsx`
- Modify: `src/components/layout/chat-area/useChatArea.ts`
- Modify: `src/components/layout/chat-area/ChatAreaProps.ts`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Write the failing integration expectation in the provider test**

```tsx
it('lets leaf components read their slice without receiving leaf props', () => {
  expect(renderedLeafProps()).toEqual('provider');
});
```

- [ ] **Step 2: Run the provider test to verify it fails**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: FAIL because `ChatArea` still forwards leaf props directly.

- [ ] **Step 3: Shrink the ChatArea root contract and build memoized slices in ChatArea**

```tsx
const contextValue = useMemo(
  () => ({
    root: { activeSessionId, t, themeId },
    messageList: { messages, sessionTitle, onEditMessage, onDeleteMessage, ... },
    input: { currentChatSettings, onSendMessage, onProcessFiles, ... },
  }),
  [activeSessionId, currentChatSettings, messages, onEditMessage, onDeleteMessage, onSendMessage, onProcessFiles, t, themeId]
);
```

- [ ] **Step 4: Stop MainContent from assembling MessageList and ChatInput prop bags**

```tsx
<ChatArea chatArea={chatArea} />
```

- [ ] **Step 5: Run the provider test again**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: PASS

### Task 3: Convert MessageList to Consume Its Slice

**Files:**
- Modify: `src/components/chat/MessageList.tsx`

- [ ] **Step 1: Write a failing component test that renders MessageList through the provider**

```tsx
it('renders from the chat-area message-list slice', () => {
  render(<ProviderWrappedMessageList />);
  expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the message-list test to verify it fails**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx src/components/chat/MessageList.preview.test.tsx`
Expected: FAIL because `MessageList` still requires direct props.

- [ ] **Step 3: Replace the exported MessageList props contract with the provider hook**

```tsx
export const MessageList: React.FC = () => {
  const {
    messages,
    sessionTitle,
    onEditMessage,
    onDeleteMessage,
  } = useChatAreaMessageList();
```

- [ ] **Step 4: Re-run the targeted message-list tests**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx src/components/chat/MessageList.preview.test.tsx`
Expected: PASS

### Task 4: Convert ChatInput to Consume Its Slice

**Files:**
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: `src/hooks/chat-input/useChatInput.ts`
- Modify: `src/types/chat.ts`

- [ ] **Step 1: Write a failing provider-backed chat-input test**

```tsx
it('renders chat input from the chat-area input slice', () => {
  render(<ProviderWrappedChatInput />);
  expect(screen.getByLabelText('Chat message input')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: FAIL because `ChatInput` still requires direct props.

- [ ] **Step 3: Move ChatInput to the provider hook and reduce the exported prop type**

```tsx
export const ChatInput: React.FC = () => {
  const props = useChatAreaInput();
  const {
    inputState,
    handlers,
  } = useChatInput(props);
```

- [ ] **Step 4: Re-run the targeted provider test**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx`
Expected: PASS

### Task 5: Final Verification

**Files:**
- No code changes required

- [ ] **Step 1: Run targeted refactor tests**

Run: `npm run test -- src/components/layout/chat-area/ChatAreaContext.test.tsx src/components/chat/MessageList.preview.test.tsx`
Expected: PASS

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Summarize the reduced boundary**

```text
MainContent now passes one chat-area root model.
ChatArea owns the provider slices.
MessageList and ChatInput no longer receive leaf prop bags from above.
```
