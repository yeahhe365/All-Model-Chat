# Certain Redundancy Cleanup Design

**Date:** 2026-04-16

**Goal**

Remove only the redundancies that are both mechanically obvious and low-risk to clean: identity wrappers, duplicated sanitization logic, repeated input state writes, and a small set of genuinely unused props/parameters.

**Scope**

- Delete the `buildAppModalsProps` and `buildChatAreaInputActions` identity wrappers.
- Collapse `sanitizeSessionForExport` onto the same implementation as `stripSessionFilePayloads`.
- Remove the duplicate `setInputText` call from `useChatInput.handleInputChange`.
- Remove these unused interfaces/parameters:
  - `ModelSelectorProps.t`
  - `UseLiveConfigProps.appSettings`
  - `UseLiveConnectionProps.chatSettings`
  - `HistorySidebarProps.language`

**Out of Scope**

- No broad `Header` and `MessageActions` prop-chain cleanup in this batch.
- No large UI refactors around `FilePreviewModal` or file-card consolidation.
- No README cleanup yet.

**Approach**

1. Add source guard tests for the exact redundant patterns so cleanup is explicit and non-ambiguous.
2. Inline the identity wrappers at the only call site in `MainContent`.
3. Keep both session helper exports for API stability, but make them share one implementation.
4. Remove duplicated state writes and truly unused type surface only where the call graph is shallow.

**Verification**

- Focused redundancy guard tests first.
- Then `npm run lint`, `npm test`, and `npm run build`.
