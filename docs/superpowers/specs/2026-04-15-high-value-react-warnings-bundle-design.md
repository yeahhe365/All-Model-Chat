# High-Value React Warnings And Bundle Follow-Up Design

**Date:** 2026-04-15

**Goal**

Ship a focused follow-up batch that reduces the most actionable React lint/compiler warnings and removes the remaining production build chunk warnings without reopening the broader `no-explicit-any` cleanup.

**Scope**

- Fix warning-producing patterns that point to real rendering or state-flow risk in the current app shell and shared hooks.
- Keep the existing architecture from [2026-04-11-hooks-defragmentation.md](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/docs/superpowers/plans/2026-04-11-hooks-defragmentation.md) intact.
- Treat the large `@typescript-eslint/no-explicit-any` backlog as a separate later batch.

**Targeted Areas**

- [src/components/layout/MainContent.tsx](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/components/layout/MainContent.tsx)
- [src/hooks/useLiveAPI.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/hooks/useLiveAPI.ts)
- [src/hooks/ui/useMessageStream.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/hooks/ui/useMessageStream.ts)
- [src/hooks/ui/usePdfViewer.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/hooks/ui/usePdfViewer.ts)
- [src/hooks/ui/usePortaledMenu.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/hooks/ui/usePortaledMenu.ts)
- [src/hooks/useAudioRecorder.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/hooks/useAudioRecorder.ts)
- [src/components/chat/message-list/WelcomeScreen.tsx](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/src/components/chat/message-list/WelcomeScreen.tsx)
- [vite.config.ts](/Users/jones/Documents/Code/All-Model-Chat/.worktrees/codex-high-value-warnings-bundle/vite.config.ts)

**Design**

1. Shared-hook warnings will be handled by removing synchronous state resets from effect bodies when the value can be derived from current props, recorder state, or an external store subscription.
2. `MainContent` callback warnings will be handled by narrowing callback dependencies to stable function references instead of whole view-model objects.
3. Live session configuration will consume `sessionHandle` state directly during render, while the existing ref remains for callback-time immediacy.
4. Bundle follow-up work will prefer more natural Vite splitting for Mermaid and HTML export code paths, while treating Graphviz as an intentionally lazy heavyweight path and updating the warning threshold accordingly if the chunk remains monolithic.

**Testing Strategy**

- Add or extend targeted tests around hook behavior and bundle guardrails before production edits.
- Re-run focused tests during the TDD cycle for each touched behavior.
- Finish with `npm run lint`, `npm run test`, and `npm run build`.

**Assumptions**

- The user explicitly chose the focused path and asked to proceed without another approval checkpoint, so implementation starts immediately after this design doc is written.
- It is acceptable for the large `no-explicit-any` backlog to remain after this batch.
