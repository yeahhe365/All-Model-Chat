# Text File Inline Input Design

**Date:** 2026-04-23

**Goal:** Let users convert an attached text file into chat input text with one click, replacing the attachment with editable prompt content directly in the composer.

## Scope

This change covers:

1. Showing a text-only inline action on selected file cards in the chat input area.
2. Reading the attached text file content and moving it into the main textarea.
3. Removing only the converted text file from the selected attachment list.
4. Preserving the rest of the chat input flow, including non-text attachments, preview, edit, upload, and send behavior.
5. Adding regression coverage for the new card action and conversion behavior.

This change does not cover:

1. Converting PDFs, images, audio, or other non-text attachments into input text.
2. Merging text file content with existing textarea content in multiple modes.
3. Adding a new modal, toolbar, or settings surface for this behavior.
4. Changing how text attachments are serialized into model content when users keep them attached.

## Problem Summary

The current chat input already supports attaching text files, previewing them, and editing them through the file editor flow. However, once a user decides that an attached text file should really become the prompt itself, there is no direct inline action for that decision. The user must manually open the file, copy its content, return to the textarea, paste it, and then remove the attachment.

That makes a common workflow feel heavier than it needs to be, especially for prompt templates, markdown notes, code snippets, and extracted `.docx -> .txt` content that already behaves like text in the current pipeline.

## Current Context

The existing implementation already gives us the right building blocks:

1. `SelectedFileDisplay.tsx` renders a compact action-oriented file card per selected attachment.
2. `ChatFilePreviewList.tsx` maps `selectedFiles` into those cards without introducing extra layout wrappers.
3. `useChatInput.ts` owns both `inputState.setInputText` and `setSelectedFiles`, so it can coordinate textarea state and attachment removal together.
4. `UploadedFile` already stores `textContent`, `rawFile`, and `dataUrl`, giving the conversion flow multiple safe sources for reading text.
5. `isTextFile(...)` already centralizes the text-file check used elsewhere in the file pipeline.

This means the feature can stay local to the chat input path without touching message-send assembly or backend API flows.

## Approaches Considered

### 1. File-card quick action

Add a small action button directly on each selected file card, visible only for text attachments.

Pros:

1. Matches the requested interaction most closely.
2. Keeps the action on the object being changed.
3. Reuses the existing card action pattern with minimal UI disruption.

Cons:

1. Requires careful button placement so it does not clash with remove, edit, and copy-ID controls.

### 2. Preview-modal conversion action

Add a convert button inside the text file preview modal.

Pros:

1. More room for explanatory text and confirmation.
2. Lower risk of accidental conversion.

Cons:

1. Adds an extra click and leaves the main request unmet because the action is not available directly on the card.

### 3. Global toolbar action

Add a toolbar action that becomes active when exactly one text file is selected.

Pros:

1. Easy to discover for keyboard-heavy users.

Cons:

1. Weak object-to-action mapping.
2. Adds new surface area for a narrowly scoped action.
3. Handles mixed selections less intuitively.

## Recommended Approach

Use **Approach 1: file-card quick action**.

The selected file card is already the place where users remove, edit, preview, and configure attachments. Converting a text file into prompt text is another file-scoped action, so it belongs beside those controls. This keeps the UI consistent and makes the interaction feel immediate instead of modal-heavy.

## Interaction Design

### Card-level affordance

For attachments where `isTextFile(file)` is true and the file is in a stable usable state, show a compact secondary action button on the selected file card.

Recommended behavior:

1. Show the action only for text-like files.
2. Hide or disable it while the file is uploading, processing, cancelled, or failed.
3. Keep the existing remove button unchanged.
4. Keep the existing edit/configure button unchanged.

The new action should visually read as “move this content into the prompt” rather than “open” or “copy”. A tooltip/accessible label should make the result explicit, such as “Move text to input”.

### Conversion result

When the user clicks the new action:

1. Read the file’s text content.
2. Replace the current textarea content with that text.
3. Remove the converted file from `selectedFiles`.
4. Keep every other selected attachment untouched.
5. Focus the textarea and place the cursor at the end of the inserted text.

This is intentionally a **replace** action, not append, because the request explicitly says the text should move into the input box and replace the text file.

## Data Flow

The conversion handler should live in the chat input hook layer so the UI stays thin.

### Read order

Use the first available source in this order:

1. `file.textContent`
2. `file.rawFile` via `fileToString(...)`
3. `file.dataUrl` fetched and read as text

This order minimizes extra file reads and preserves compatibility with:

1. Text files whose content was already loaded for editing.
2. Newly attached files that still have an in-memory `File`.
3. Rehydrated session files that only have a preview URL available.

### State updates

The handler should update composer state in one flow:

1. Resolve text content.
2. Set the textarea value to the resolved content.
3. Remove the specific file from `selectedFiles`.
4. Focus the textarea.

If text resolution fails, the handler should leave both the textarea and file list unchanged and surface an input-level error.

## Edge Cases

1. If the textarea already contains text, conversion still replaces it.
2. If multiple text files are attached, only the clicked file is converted and removed.
3. If a text file has empty content, the input should become empty and the file should still be removed, because the action is a transfer rather than a validation gate.
4. If text reading fails, do not silently remove the file.
5. Files that became `.txt` during `.docx` extraction should work automatically because they already enter the system as text attachments.
6. Non-text attachments in the same selection should remain unchanged.

## Testing

Add regression coverage that proves:

1. text attachments render the new conversion action on selected file cards
2. non-text attachments do not render that action
3. clicking the action moves file text into the textarea
4. clicking the action removes only the converted file from the selection
5. the handler falls back from `textContent` to `rawFile` when needed
6. failed text resolution does not clear the textarea or remove the file

## Implementation Notes

1. Keep the new action within `SelectedFileDisplay.tsx`; do not add a separate wrapper component unless the card becomes meaningfully more complex.
2. Keep file-read logic out of the card component and inside the existing chat input hook layer.
3. Reuse existing helpers like `isTextFile(...)` and `fileToString(...)` instead of duplicating MIME or file-reader logic.
4. Do not change `buildContentParts(...)`; this feature only changes the user’s choice of whether a text file stays attached.
