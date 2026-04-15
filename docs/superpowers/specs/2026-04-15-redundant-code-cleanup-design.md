# Redundant Code Cleanup Design

**Date:** 2026-04-15

**Goal**

Remove low-risk redundant state and unused interfaces that currently add synchronization effects, lint noise, and maintenance overhead without changing user-visible behavior.

**Scope**

- Clean `FileConfigurationModal` so it stops mirroring one file prop into four separate pieces of local state via an effect.
- Clean `DeferredDiagramBlock` so eager loading no longer needs an extra `eager -> isLoading` synchronization effect.
- Clean `useSlashCommands` so it no longer accepts or depends on the unused `onStopGenerating` callback.

**Non-Goals**

- No broad rewrite of `FilePreviewModal` and `TextFileViewer` ownership yet.
- No cleanup of the larger `no-explicit-any` backlog.
- No UI behavior changes beyond preserving the current draft/reset semantics.

**Approach**

1. Introduce a keyed inner content component for `FileConfigurationModal`, with a single draft object initialized from the current file. This removes the per-field mirror effect while preserving reset behavior on file switch and reopen.
2. Replace `DeferredDiagramBlock`’s duplicated eager/loading state with a single “load requested” state plus a derived `shouldLoad` flag.
3. Delete the dead `onStopGenerating` prop from `useSlashCommands` and its call site in `useChatInput`.

**Verification**

- Add source-level guardrail tests for the cleaned patterns so the redundant code does not come back quietly.
- Re-run focused tests for the touched modules, then `npm run lint`, `npm test`, and `npm run build`.
