# Chat Input State Decoupling Design

## Context

`useChatInput.ts` currently coordinates composer state, file workflows, voice input, slash commands, queueing, live mode, translation, keyboard handling, and view model assembly. The recent module split improved local responsibilities, but state transitions still span multiple hooks through booleans such as `isWaitingForUpload`, `isAddingById`, `isTranslating`, `isFullscreen`, queue state, and live connection state.

The UI layer also receives `QueuedSubmissionCard` and `LiveStatusBanner` data through the main `ChatInput.tsx` view-model assembly. That keeps visual components simple, but leaves the top-level component responsible for status prop shaping that can live closer to the chat input view context.

## Approaches Considered

1. Add XState.
   This would provide explicit finite state semantics and visualization, but adds a dependency and is heavier than the current state complexity requires.

2. Rewrite `useChatInput` around a single state machine.
   This could produce a clean end state, but it would touch many workflows at once and increase regression risk around file upload, live mode, editing, and queue flushing.

3. Add a local reducer/state-machine core and move status view props into context helpers.
   This is the recommended path. It keeps the public hook shape stable, adds testable transition logic, and removes status prop drilling incrementally without introducing a new dependency.

## Design

Add a small `chatInputStateMachine` module under `src/hooks/chat-input/`. It will expose a reducer, initial state, action types, and selectors for the coarse composer mode:

- `editing`: editing or resending an existing message.
- `queuing`: a queued submission exists or the current message can be queued while generation is loading.
- `live`: native audio live mode is connected, reconnecting, or has a live error.
- `processing`: upload/file/conversion/translation/add-by-id work blocks normal input.
- `idle`: normal text entry.

The reducer will own local UI flags that are currently independent `useState` booleans: translation progress, send animation, add-by-id/add-by-url progress, upload waiting, and fullscreen mode. Text, quotes, TTS context, and simple input field strings will remain in `useChatInputState` for now because they have draft persistence and cross-tab synchronization behavior.

`useChatInputState` will wrap the reducer with compatibility setters so existing sub-hooks can migrate gradually. The first implementation should preserve the current return shape while routing those booleans through reducer actions.

For UI status, extend `ChatInputViewContext` with focused hooks for queued submission and live status, such as `useQueuedSubmissionView` and `useLiveStatusView`. `ChatInputArea` should consume those hooks directly near the render sites. `ChatInput.tsx` will still compute the source values from `useChatInput`, but the status-specific prop access will move out of the broader area destructuring so `QueuedSubmissionCard` and `LiveStatusBanner` are no longer drilled through the full area view object.

## Error Handling

The reducer should be conservative: unknown modes are not represented, and existing error strings remain sourced from live API/file APIs. Queue upload failure behavior stays in `useMessageQueue`, which already handles blocking file upload errors.

## Testing

Add unit tests for the reducer/selectors to prove the mode priority and flag transitions. Update `ChatInputViewContext` tests to cover the new focused status hooks. Keep existing component tests for queued submission and live status intact to guard rendering behavior.

## Out of Scope

This change does not replace all chat input hooks, does not change file upload semantics, does not change live API behavior, and does not introduce XState.
