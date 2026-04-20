# File Upload Progress Design

**Date:** 2026-04-20

**Goal:** Add real upload progress and upload speed to file cards while keeping Gemini-side processing visible as a separate post-upload stage.

## Scope

This change covers:

1. Replacing the current SDK-only Gemini file upload path with a resumable HTTP upload flow that emits real upload progress events.
2. Showing per-file upload percentage, transfer speed, and a dedicated processing stage on the chat input file cards.
3. Preserving existing cancel behavior, file polling, and upload-state gating for message sending.
4. Adding regression tests for both the upload transport and the selected-file upload UI.

This change does not cover:

1. Fake processing percentages for Gemini server-side file preparation.
2. Changes to inline file handling that never goes through Gemini Files API.
3. New settings or user-configurable upload display preferences.

## Problem Summary

The upload pipeline already stores `progress` and `uploadSpeed` on `UploadedFile`, and the selected-file card already distinguishes `uploading` from `processing_api`. However, the actual upload transport uses `ai.files.upload(...)`, which does not surface byte-level progress events in the browser. The result is that cards show only a generic uploading state and then jump straight to completion, which makes large uploads feel stalled and hides the handoff to Gemini-side processing.

## Approach

### 1. Use resumable HTTP upload for File API transfers

For files that already require Gemini Files API, switch the transport from the SDK helper to the documented resumable REST upload flow:

1. Start the resumable session with file metadata.
2. Capture the returned upload URL.
3. Upload the file bytes through an `XMLHttpRequest` so browser upload progress events can drive UI updates.

This keeps the existing Gemini response shape (`name`, `uri`, `state`) while making real progress available.

### 2. Keep upload and processing as two distinct stages

The UI should communicate two phases clearly:

1. `Uploading`: byte transfer is still in progress, so percentage and speed are meaningful.
2. `Processing on Gemini`: byte transfer is done, but the file is not yet `ACTIVE`, so only stage text should be shown.

We should not invent a Gemini processing percentage because the backend does not expose one in this flow.

### 3. Upgrade the selected-file card instead of adding a new surface

The current selected-file card is already the right home for this information. It should gain:

1. a compact progress bar during upload
2. a percentage label when uploading
3. a speed label when uploading
4. a clearer processing label after upload completes

This keeps the experience local to the file the user is watching and avoids extra banners or modal-only status.

### 4. Preserve proxy and cancel compatibility

The transport must continue to work when the app is configured with a Gemini proxy URL. The upload path should derive the same normalized base URL used elsewhere in the API layer. Cancel actions should still abort the live request and leave the file in the existing cancelled state.

## Testing

Add regression coverage that proves:

1. the File API transport starts a resumable upload session and forwards progress updates
2. proxy-aware upload URLs are built from the configured base URL
3. abort signals cancel the in-flight upload
4. selected-file cards render upload percentage and speed during `uploading`
5. selected-file cards switch to a processing stage label after upload reaches 100% but before the file becomes `active`

## Implementation Notes

1. Keep speed calculation in the existing uploader layer so UI stays dumb.
2. Prefer exposing a typed helper for the resolved upload base URL instead of duplicating proxy logic inside the file API module.
3. Avoid broad refactors; this should stay focused on the File API transport and the selected-file card UI.
