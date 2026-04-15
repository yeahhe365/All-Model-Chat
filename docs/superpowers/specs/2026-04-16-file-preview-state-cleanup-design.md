# File Preview State Cleanup Design

**Date:** 2026-04-16

**Goal**

Reduce redundant state ownership between `FilePreviewModal`, `FilePreviewHeader`, and `TextFileViewer` without changing the file preview feature set.

**Scope**

- Remove the duplicate copy state bridge between `FilePreviewModal` and `FilePreviewHeader`.
- Stop `TextFileViewer` from mirroring controlled `content` into local component state.
- Replace `FilePreviewModal`'s file-reset effect with a keyed inner content component, and only pass controlled text content to the viewer while editing.

**Approach**

1. Let `FilePreviewHeader` own its copy state completely.
2. Keep `TextFileViewer` dual-mode, but make controlled mode render directly from `content` instead of writing it back into local state.
3. Move `FilePreviewModal` state into a keyed inner component so the current file naturally resets modal state on remount instead of synchronizing with an effect.

**Verification**

- Add source guard tests for the removed duplicate state patterns.
- Re-run focused file-preview tests, then `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
