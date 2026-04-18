# Core Chat Surface Repair Design

**Date:** 2026-04-16

**Goal:** Repair the five backlog items around chat input composition, Pyodide worker recovery, Live API audio cleanup, streaming cache retention, and local Office preview without disturbing the existing Local-First data model.

## Scope

This repair covers:

1. Reducing `ChatInput.tsx` / `ChatInputArea.tsx` prop-glue complexity.
2. Making `PyodideService` recover from hung or crashed workers and reject overlapping execution safely.
3. Clearing Live API playback and buffered audio when a connection drops or reconnects.
4. Adding automatic garbage collection to `streamingStore` when abnormal stream termination skips `clear(id)`.
5. Rendering `.docx` previews client-side in `FilePreviewModal`.

## Approach

### 1. Chat Input Composition

Keep `ChatAreaContext` stable for the rest of the app, but stop pushing a giant `ChatInputAreaProps` object through the final render boundary. Introduce a small chat-input-local view context in the `src/components/chat/input/` tree so `ChatInput.tsx` assembles the view model once and `ChatInputArea.tsx` plus future children read only what they need.

This keeps the refactor low-risk:

- no persistence changes
- no `ChatAreaProvider` contract break
- no new app-wide props

### 2. Pyodide Resilience

`PyodideService` should manage exactly one worker lifecycle at a time:

- reject concurrent `runPython()` requests with a clear error
- reset the worker when a request times out
- reset the worker when the worker emits `error` / `messageerror`
- reject all in-flight promises during fatal reset

This prevents a poisoned worker from leaving later requests pending forever.

### 3. Live Audio Queue Hygiene

Live reconnection should clear both playback state and buffered PCM chunks before reconnect attempts and after unexpected disconnects. The queue reset should be explicit and callable from the connection layer rather than being implicit inside transcript finalization.

### 4. Streaming Store GC

`streamingStore` should keep lightweight per-message timestamps and listener counts, then lazily evict abandoned entries with a TTL-driven sweep. Normal `clear(id)` remains authoritative; GC only handles abnormal paths.

### 5. Office Preview

Add a shared `.docx` text extraction helper based on the existing mammoth worker approach, then reuse it in preview mode. The preview path should:

- prefer existing `textContent`
- fall back to `rawFile`
- avoid mutating persisted message/file data
- show loading/error states cleanly

## Data Flow Notes

- No IndexedDB schema changes.
- No `BroadcastChannel` protocol changes.
- Blob URL lifecycle rules remain unchanged; new preview logic must not create untracked blob URLs.
- Live audio cleanup must not double-finalize transcripts or leak playback nodes.

## Testing

- `streamingStore`: add GC behavior tests and preserve existing live snapshot behavior.
- `pyodideService`: add red-green coverage for timeout reset, worker crash reset, and overlapping execution rejection.
- `useLiveConnection` / `useLiveMessageProcessing`: cover queue clearing on unexpected disconnect/reconnect.
- `FilePreviewModal`: cover `.docx` preview loading path and fallback error UI.
- `ChatInputArea`: add structural tests around the new local view provider / hooks, keeping render behavior unchanged.

## Execution Note

The standard brainstorming review gate is intentionally compressed here because the user explicitly requested immediate implementation without back-and-forth approval.
