# Chat Input Compatibility Cleanup Design

## Context

The chat input reducer and focused view hooks already exist. The remaining transitional code is mostly setter-shaped compatibility around reducer flags and a few tests or components that still lean on broad view-model access.

## Goal

Remove the small compatibility layer without changing composer behavior. Reducer-owned flags should be changed through explicit chat-input actions, and queued/live UI status should be read through focused view hooks.

## Approach

Keep `useChatInput` as the integration facade for this iteration. It still wires core state, files, submission, clipboard, translation, keyboard, voice, slash commands, and view model assembly.

Replace legacy `setIsTranslating`, `setIsAddingById`, `setIsWaitingForUpload`, and `setIsFullscreen` return fields with a compact reducer action API exposed from `useChatInputState`. Existing sub-hooks will receive only the specific action callbacks they need:

- Translation receives `setTranslating`.
- Add-by-id receives `setAddingById`.
- Queue upload waiting receives `setWaitingForUpload`.
- Submission fullscreen exit receives `exitFullscreen`.
- Send animation receives `startSendAnimation` and `stopSendAnimation`.

The reducer and selectors remain the single source of truth for these flags. Boolean values such as `isTranslating` and `isFullscreen` stay available because UI and workflow code still need to read them.

For the view layer, `ChatInputArea` should continue to use `useChatInputView` for broad layout/input/action props, but queued submission and live status rendering must use `useQueuedSubmissionView` and `useLiveStatusView` only. Tests should avoid asserting through the full view object for those status slices.

## Testing

Add source-level regression tests that fail while legacy setter fields or old status-slice access remain. Keep reducer, context, and chat input component tests green to prove behavior is unchanged.

## Out Of Scope

This does not introduce a new state library, does not move queue or live state into the reducer, does not remove the `useChatInput` facade, and does not change file upload or message submission semantics.
