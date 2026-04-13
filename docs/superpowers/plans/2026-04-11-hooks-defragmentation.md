# Hooks Defragmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defragment `src/hooks/` by collapsing artificial orchestration layers, removing props-builder and forwarding hooks, and simplifying the main app/chat/chat-input flows without changing user-visible behavior.

**Architecture:** Keep a small number of domain entry hooks (`app`, `chat`, `chat-input`, `message-sender`) and move technical-layer wrappers out of the hook tree. When logic does not need React, convert it to plain functions instead of inventing another hook layer.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest

---

### Task 1: Guard Chat Input Behavior Before Flattening

**Files:**
- Create: `src/hooks/chat-input/chatInputUtils.test.ts`
- Create: `src/hooks/chat-input/chatInputUtils.ts`

- [ ] Add a failing test for submit text composition with quotes and TTS context.
- [ ] Add a failing test for the quoted-message formatting path without TTS context.
- [ ] Implement the pure helpers used by the tests.
- [ ] Run `npm run test -- src/hooks/chat-input/chatInputUtils.test.ts`.

### Task 2: Collapse Chat Input Handler Splitting

**Files:**
- Modify: `src/components/chat/input/ChatInput.tsx`
- Modify: `src/hooks/chat-input/useChatInputLogic.ts`
- Modify: `src/hooks/chat-input/useChatInputEffects.ts`
- Delete: `src/hooks/chat-input/handlers/useFileManagementHandlers.ts`
- Delete: `src/hooks/chat-input/handlers/useFileSelectionHandlers.ts`
- Delete: `src/hooks/chat-input/handlers/useInputAndPasteHandlers.ts`
- Delete: `src/hooks/chat-input/handlers/useKeyboardHandlers.ts`
- Delete: `src/hooks/chat-input/handlers/useSubmissionHandlers.ts`

- [ ] Inline the handler-only sub-hooks into the chat input entry hook.
- [ ] Replace duplicated inline formatting with the tested helper module from Task 1.
- [ ] Rename the entry hook to reflect domain ownership rather than orchestration.
- [ ] Run the chat-input helper test again after the refactor.

### Task 3: Collapse App Props/Logic Layers

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/app/useAppLogic.ts`
- Modify: `src/hooks/app/useAppInitialization.ts`
- Modify: `src/hooks/app/useAppTitle.ts`
- Delete: `src/hooks/app/logic/useAppHandlers.ts`
- Delete: `src/hooks/app/logic/useAppSidePanel.ts`
- Delete: `src/hooks/app/props/useAppModalsProps.ts`
- Delete: `src/hooks/app/props/useChatAreaProps.ts`
- Delete: `src/hooks/app/props/useSidebarProps.ts`
- Delete: `src/hooks/app/useAppProps.ts`
- Delete: `src/hooks/useDataManagement.ts`

- [ ] Inline app handler composition and data-management composition into the app entry hook.
- [ ] Build `MainContent` props in `App.tsx` instead of via hook-based props builders.
- [ ] Remove the `props/` layer entirely.
- [ ] Run `npm run typecheck`.

### Task 4: Collapse Message Sender Forwarding Layers

**Files:**
- Modify: `src/hooks/chat/useChat.ts`
- Modify: `src/hooks/useMessageSender.ts`
- Modify: `src/hooks/message-sender/useStandardChat.ts`
- Modify: `src/hooks/message-sender/useChatStreamHandler.ts`
- Modify: `src/hooks/message-sender/useCanvasGenerator.ts`
- Modify: `src/hooks/message-sender/useImageEditSender.ts`
- Modify: `src/hooks/message-sender/useTtsImagenSender.ts`
- Delete: `src/hooks/message-sender/standard/useApiInteraction.ts`
- Delete: `src/hooks/message-sender/standard/useSessionUpdate.ts`
- Delete: `src/hooks/useMessageHandler.ts`

- [ ] Merge the `standard/` flow into `useStandardChat`.
- [ ] Compose `useMessageSender`, message actions, and text-to-speech directly in `useChat`.
- [ ] Remove forwarding-only wrapper hooks.
- [ ] Run `npm run typecheck`.

### Task 5: Simplify `useChat` Store Wiring

**Files:**
- Modify: `src/hooks/chat/useChat.ts`
- Modify: `src/stores/chatStore.ts`

- [ ] Replace local adapter wrappers with direct store actions where the store already supports updater semantics.
- [ ] Keep only the minimum local glue needed for computed chat state.
- [ ] Run `npm run test`.

### Task 6: Final Verification

**Files:**
- No code changes required

- [ ] Run `npm run test`.
- [ ] Run `npm run typecheck`.
- [ ] Summarize the deleted hook layers and the remaining domain entry hooks.
