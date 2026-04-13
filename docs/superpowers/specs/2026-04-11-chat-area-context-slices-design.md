# Chat Area Context Slices Design

**Date:** 2026-04-11

## Goal

Remove the remaining `MainContent -> ChatArea -> MessageList / ChatInput` prop-drilling chain by moving chat-area composition behind focused context slices, while preserving current runtime behavior and staying compatible with the dirty local refactor already in progress.

## Context

The current `ChatArea` path still relies on one large transport interface:

- [`src/components/layout/chat-area/ChatAreaProps.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/components/layout/chat-area/ChatAreaProps.ts)
- [`src/components/layout/MainContent.tsx`](/Users/jones/Documents/Code/All-Model-Chat/src/components/layout/MainContent.tsx)
- [`src/components/layout/ChatArea.tsx`](/Users/jones/Documents/Code/All-Model-Chat/src/components/layout/ChatArea.tsx)

That interface mixes:

- session data
- derived UI flags
- drag/drop chrome
- message-list actions
- chat-input actions
- store-backed state that `ChatArea` already reads directly

As a result, `MainContent` has become a prop-assembly layer, `ChatArea` has become a pass-through hub, and leaf components still depend on a large upstream contract even after the Zustand migration.

## Decision

This refactor will replace the large `ChatAreaProps` transport contract with a provider-driven boundary inside `ChatArea`.

`ChatArea` will accept a coarse root input from `MainContent`, then publish smaller context slices for:

- `chat area shell`: drag/drop, header-adjacent chrome, shared translation
- `message list`: message rendering data and message-level actions
- `chat input`: input-specific state, toggles, file actions, and send/edit actions

Leaf components will consume their own slice through dedicated hooks instead of receiving dozens of props.

## Scope

### In Scope

- add a `ChatArea` provider layer under `src/components/layout/chat-area/`
- replace `ChatAreaProps` with a smaller root contract
- stop `MainContent` from assembling `MessageList` and `ChatInput` props
- convert `MessageList` to read from a message-list context hook
- convert `ChatInput` to read from a chat-input context hook
- keep `Header` on direct props for now so this batch stays limited to the requested `A` boundary

### Out of Scope

- redesigning `Header`
- rewriting `useApp` or `useChat` ownership boundaries
- moving every action into Zustand in one batch
- changing user-visible chat behavior

## Target Structure

- `ChatArea.tsx`
  - receives a small root model from `MainContent`
  - creates memoized context slice values
  - renders `Header` directly
  - renders `MessageList` and `ChatInput` inside the provider
- `chat-area/`
  - `ChatAreaContext.tsx`
  - slice hooks such as `useChatAreaMessageList` and `useChatAreaInput`
  - existing `useChatArea.ts` kept only for chat-area-local UI logic

## Data Flow

### MainContent to ChatArea

`MainContent` should pass one root object that represents the chat-area boundary, rather than precomputing leaf props. The root object may still contain actions from `app`, `chatState`, `uiState`, and `pipState`, but those values stop at `ChatArea`.

### ChatArea to Leaf Components

`ChatArea` will:

1. read store-backed values it already owns directly
2. combine them with the root object
3. publish smaller memoized slice objects
4. let `MessageList` and `ChatInput` consume only their own slice

This keeps leaf dependencies explicit without reintroducing a monolithic context value.

## Rendering and Performance

One giant context would recreate the same rerender fan-out as one giant prop bag. This design avoids that by separating the provider values by responsibility and memoizing each slice independently.

The expected rerender improvements are:

- `MessageList` no longer rerenders because unrelated chat-input-only props changed
- `ChatInput` no longer rerenders because message-list-only props changed
- `MainContent` no longer pays the cost of assembling and diffing leaf prop bags

## Testing Strategy

This is primarily a structural refactor, so tests should focus on the new boundary:

- provider hook tests that fail when a consumer is rendered outside the provider
- provider hook tests that verify the input and message-list slices expose the expected values
- targeted component tests proving `MessageList` and `ChatInput` still work when driven by the provider boundary
- `npm run test -- <targeted tests>`
- `npm run typecheck`

## Risks

### Dirty worktree overlap

The target files already contain local edits. This batch must build on top of those edits instead of resetting to `HEAD`.

### Context overgrowth

If the provider simply republishes the old mega-interface as one value, the refactor will not solve the performance or ownership problem. The slices must stay focused.

### Type churn

Moving transport contracts from shared prop types into provider slice types may expose loose typing in `MainContent`, `ChatArea`, and `ChatInput`.

## Expected Outcome

- `ChatAreaProps` is removed or reduced to a thin root model
- `MainContent` stops acting as a leaf-props assembler
- `MessageList` and `ChatInput` consume narrow context slices
- the chat-area boundary becomes a stable place for future ownership cleanup
