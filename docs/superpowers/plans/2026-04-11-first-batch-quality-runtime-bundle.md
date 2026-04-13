# First Batch Quality, Runtime, and Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a reliable quality gate, fix chat URL state drift, remove runtime CDN stylesheet dependencies, and tighten export/diagram bundling without broad architectural churn.

**Architecture:** Keep the current app structure intact and focus on narrow, verifiable repairs. Treat React compiler migration rules separately from true correctness errors, move runtime styling ownership fully into repo-managed assets/CSS, and split export-related code by importing leaf modules instead of the aggregate barrel.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, ESLint, highlight.js, lucide-react

---

### Task 1: Restore Lint Gate

**Files:**
- Modify: `eslint.config.js`
- Modify: `src/utils/export/core.ts`
- Modify: `src/utils/mediaUtils.ts`
- Modify: `src/utils/audio/audioProcessing.ts`
- Modify: `src/utils/chat/builder.ts`
- Modify: `src/utils/__tests__/db.test.ts`

- [ ] Reconfigure ESLint ignores for local worktrees and downgrade React compiler migration rules that are not safe to bulk-fix in this batch.
- [ ] Fix remaining true lint errors in utility and test files.
- [ ] Run `npm run lint` and confirm it exits cleanly.

### Task 2: Fix Active Session URL Sync

**Files:**
- Modify: `src/stores/chatStore.ts`
- Modify: `src/stores/__tests__/chatStore.test.ts`

- [ ] Add a failing test covering `setActiveSessionId(null)` while the app is on `/chat/:id`.
- [ ] Update URL sync logic so clearing the active session always normalizes back to `/`.
- [ ] Run `npm run test -- src/stores/__tests__/chatStore.test.ts` or the equivalent Vitest target and confirm the regression passes.

### Task 3: Remove Runtime CDN Styles

**Files:**
- Modify: `index.html`
- Modify: `src/index.tsx`
- Modify: `src/styles/markdown.css`
- Modify: `src/utils/uiUtils.ts`
- Modify: `src/components/message/code-block/LanguageIcon.tsx`

- [ ] Remove CDN stylesheet tags from the HTML shell.
- [ ] Move syntax/markdown presentation into repo-owned CSS and local imports.
- [ ] Replace the Font Awesome dependency in code language badges with local `lucide-react` icons.
- [ ] Run `npm run build` and verify the app still ships with local stylesheet ownership only.

### Task 4: Tighten Export and Diagram Bundles

**Files:**
- Modify: `src/hooks/data-management/useChatSessionExport.ts`
- Modify: `src/hooks/data-management/useDataExport.ts`
- Modify: `src/hooks/features/useScenarioManager.ts`
- Modify: `src/hooks/ui/useCodeBlock.ts`
- Modify: `src/hooks/ui/useHtmlPreviewModal.ts`
- Modify: `src/hooks/useMessageExport.ts`
- Modify: `src/components/layout/SidePanel.tsx`
- Modify: `src/components/message/FileDisplay.tsx`
- Modify: `src/components/message/blocks/GraphvizBlock.tsx`
- Modify: `src/components/message/blocks/MermaidBlock.tsx`
- Modify: `src/components/message/blocks/TableBlock.tsx`
- Modify: `src/components/message/blocks/ToolResultBlock.tsx`
- Modify: `src/components/shared/AudioPlayer.tsx`
- Modify: `src/components/shared/file-preview/FilePreviewHeader.tsx`
- Modify: `vite.config.ts`

- [ ] Replace broad `exportUtils` imports with direct submodule imports so dynamic loading can split correctly.
- [ ] Keep heavy export/image functionality lazy at usage sites.
- [ ] Adjust Vite chunking only where it materially improves current output.
- [ ] Run `npm run build` and compare warning output/chunking against the current baseline.

### Task 5: Final Verification

**Files:**
- No code changes required

- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Summarize what improved, what warnings remain, and any follow-up work that should be queued separately.
