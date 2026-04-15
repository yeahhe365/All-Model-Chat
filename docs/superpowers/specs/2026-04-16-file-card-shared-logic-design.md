# File Card Shared Logic Design

**Date:** 2026-04-16

**Goal**

Reduce duplicated file-card decision logic between `SelectedFileDisplay` and `FileDisplay` while keeping their layouts independent.

**Scope**

- Extract common file-card derivation logic for:
  - file category
  - file type booleans (`isVideo`, `isImage`, `isPdf`, `isText`)
  - whether configuration is available
  - which configuration icon to show
- Keep copy, download, and layout behavior inside each component for now.

**Approach**

1. Add a small shared helper under `src/utils/` that derives file-card UI metadata from an `UploadedFile` plus a few mode flags.
2. Update `SelectedFileDisplay` and `FileDisplay` to consume that helper instead of re-deriving the same flags locally.
3. Add helper tests and one small component guard to keep the shared decision logic from drifting again.

**Verification**

- Run focused helper/component tests first.
- Then run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
