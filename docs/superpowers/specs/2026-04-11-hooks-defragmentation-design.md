# Hooks Defragmentation Design

**Date:** 2026-04-11

## Goal

Reduce `src/hooks/` fragmentation by removing hooks that only assemble props, forward handlers, or split one workflow into artificial micro-hooks, while preserving runtime behavior.

## Context

The current `src/hooks/` tree mixes three very different concerns under the same abstraction:

- genuine reusable React/browser hooks
- domain entry hooks
- technical-layer wrappers such as `useXLogic`, `useXProps`, `useXHandlers`, and `standard/`

That shows up most clearly in:

- [`src/hooks/chat-input/useChatInputLogic.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/chat-input/useChatInputLogic.ts)
- [`src/hooks/app/useAppLogic.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/app/useAppLogic.ts)
- [`src/hooks/app/useAppProps.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/app/useAppProps.ts)
- [`src/hooks/useMessageHandler.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/useMessageHandler.ts)
- [`src/hooks/message-sender/standard/useApiInteraction.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/message-sender/standard/useApiInteraction.ts)
- [`src/hooks/message-sender/standard/useSessionUpdate.ts`](/Users/jones/Documents/Code/All-Model-Chat/src/hooks/message-sender/standard/useSessionUpdate.ts)

Those layers increase file hopping, hide the real workflow behind orchestration code, and create long parameter lists with weak boundaries.

## Decision

This batch will treat `src/hooks/` as a place for:

- hooks that genuinely use React lifecycle/state/effects
- a small number of domain entry hooks with clear responsibilities

This batch will remove or collapse hooks that only:

- build props for components
- spread together other hooks without adding a stable abstraction
- split one workflow into many handler-specific hooks
- wrap one domain hook around two or three other domain hooks just to forward results

## Scope

### 1. Collapse `app` orchestration layers

Replace the current `useAppLogic` + `useAppProps` + `props/` structure with one app entry hook.

In scope:

- inline `useAppHandlers` into the app entry hook
- remove `useAppProps`
- remove `app/props/`
- move remaining focused side-effect hooks out of `app/logic/` if they still belong in `app/`

Out of scope:

- redesigning `MainContent`, `HistorySidebar`, or modal components

### 2. Collapse `chat-input` handler splitting

Replace the current `useChatInputLogic` plus `handlers/` fan-out with one cohesive chat input hook.

In scope:

- remove `chat-input/handlers/`
- keep true local state/effect hooks only if they remain independently meaningful
- move pure submit/paste helpers to plain functions when React is not required

### 3. Collapse `message-sender` forwarding layers

Flatten the standard sender path and remove pure forwarding hooks.

In scope:

- remove `message-sender/standard/`
- merge standard API/session update flow into `useStandardChat`
- remove `useMessageHandler` and compose its remaining pieces directly in `useChat`

### 4. Remove thin data-management wrapper hooks

`useDataManagement` currently only aggregates import/export hooks. That aggregation should move to the app entry hook.

In scope:

- remove `useDataManagement`
- compose `useDataExport`, `useDataImport`, and `useChatSessionExport` directly where needed

### 5. Simplify `useChat` orchestration

Keep `useChat` as the main chat-domain entry hook, but remove boilerplate that exists only because store actions are accessed indirectly.

In scope:

- use store selectors/actions directly where possible
- reduce local adapter wrappers
- keep focused sub-hooks that represent real domain capabilities such as history, files, suggestions, and streaming

## Target Structure

After this batch, the hook tree should trend toward:

- `app/`
  - one main app hook
  - a small number of focused effect hooks if they still justify their own files
- `chat-input/`
  - one main chat input hook
  - optional plain helper module for pure transformations
- `message-sender/`
  - domain hooks only, without `standard/`
- root `hooks/`
  - no forwarding-only wrappers like `useAppProps`, `useDataManagement`, `useMessageHandler`

## Testing Strategy

Because this batch is primarily structural, tests should focus on behavior that is easy to regress while moving code:

- chat input submit text composition
- any extracted pure helper behavior
- existing type/build checks across the full app

Verification for the batch:

- targeted tests for any new pure helper modules
- `npm run test`
- `npm run typecheck`

## Risks

### Hidden coupling in dirty worktree

Several files in the affected areas already have local edits. This refactor must work with those changes rather than reverting them.

### Type churn during flattening

Removing prop-builder and handler-wrapper layers will expose weakly typed boundaries that were previously hidden by pass-through interfaces.

### Hook behavior regressions

When code moves from many hooks into fewer hooks, dependency arrays and closure behavior must be rechecked carefully.

## Expected Outcome

- fewer directories whose only purpose is technical layering
- fewer file jumps to understand one workflow
- fewer artificial hook names such as `Logic`, `Props`, and `Handlers`
- clearer domain boundaries in `app`, `chat-input`, `chat`, and `message-sender`
