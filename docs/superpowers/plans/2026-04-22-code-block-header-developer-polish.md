# Code Block Header Developer Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the code block header so the language badge feels like a professional developer tool while keeping all header actions visible.

**Architecture:** Keep the existing `CodeBlock -> CodeHeader -> LanguageIcon` composition, but make `LanguageIcon` responsible for normalized language metadata and branded badge rendering. Update `CodeHeader` to use the dedicated header background token and a denser toolbar treatment without changing the action set.

**Tech Stack:** React 18, TypeScript, Tailwind utility classes, Vitest

---

### Task 1: Lock the new language badge behavior with tests

**Files:**
- Create: `src/components/message/code-block/LanguageIcon.test.tsx`

- [ ] Write tests that verify branded badges render for Python and TSX and that unknown languages fall back safely.
- [ ] Run `npm test -- src/components/message/code-block/LanguageIcon.test.tsx` and confirm the new expectations fail for the current implementation.

### Task 2: Lock the stronger header chrome with tests

**Files:**
- Create: `src/components/message/blocks/parts/CodeHeader.test.tsx`

- [ ] Write tests that verify the header uses the dedicated header background token, keeps all controls visible, and renders the upgraded language badge.
- [ ] Run `npm test -- src/components/message/blocks/parts/CodeHeader.test.tsx` and confirm the new expectations fail for the current implementation.

### Task 3: Implement the badge and toolbar upgrade

**Files:**
- Modify: `src/components/message/code-block/LanguageIcon.tsx`
- Modify: `src/components/message/blocks/parts/CodeHeader.tsx`

- [ ] Add normalized display names and language-specific badge treatments.
- [ ] Update the header shell to use the code-block header token and denser toolbar grouping while preserving all visible actions.

### Task 4: Verify the targeted surface

**Files:**
- Test: `src/components/message/code-block/LanguageIcon.test.tsx`
- Test: `src/components/message/blocks/parts/CodeHeader.test.tsx`

- [ ] Run `npm test -- src/components/message/code-block/LanguageIcon.test.tsx src/components/message/blocks/parts/CodeHeader.test.tsx`.
- [ ] If the targeted tests pass, report the exact verification command and results before claiming completion.
