# UI Click Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the remaining click instability caused by hidden hit targets, async session-loading races, and fragile sidebar popover close behavior.

**Architecture:** Lock the current failures with behavioral tests first, then fix hit-testing at the component boundary, make session loading last-click-wins, and simplify the recent-chats popover so close behavior is driven by explicit outside interactions instead of hover timers alone.

**Tech Stack:** React 18, Zustand, Vitest, Playwright

---

### Task 1: Hidden Hit Targets

**Files:**
- Modify: `e2e/sidebar-interactions.spec.ts`
- Modify: `src/components/sidebar/SessionItem.tsx`
- Modify: `src/components/sidebar/GroupItem.tsx`
- Modify: `src/components/message/FileDisplay.tsx`

- [ ] Add a failing mobile interaction test that taps the right side of a session row and expects the session to open instead of a hidden menu.
- [ ] Run the Playwright spec and verify the new mobile test fails for the current implementation.
- [ ] Update hover-only action buttons so hidden state also disables pointer events, then re-enable pointer events only when the action is visible.
- [ ] Re-run the sidebar Playwright spec and verify the mobile interaction test passes.

### Task 2: Async Session Loading Race

**Files:**
- Add: `src/hooks/chat/history/useSessionLoader.test.tsx`
- Modify: `src/hooks/chat/history/useSessionLoader.ts`

- [ ] Add a failing hook test that starts two `loadChatSession` calls, resolves them out of order, and expects the later user selection to win.
- [ ] Run the new Vitest file and verify the race test fails against the current hook.
- [ ] Add request sequencing or staleness guards inside `useSessionLoader` so stale results cannot overwrite a newer selection.
- [ ] Re-run the new Vitest file and verify the race test passes.

### Task 3: Recent Chats Popover Stability

**Files:**
- Modify: `e2e/sidebar-interactions.spec.ts`
- Modify: `src/components/sidebar/CollapsedRecentChatsButton.tsx`

- [ ] Add a failing interaction test that opens the recent-chats popover, moves away, and verifies it only closes on explicit outside interaction or Escape instead of transient hover loss.
- [ ] Run the focused Playwright spec and verify the new popover test fails.
- [ ] Simplify the popover close logic so hover transit does not race against delayed close timers.
- [ ] Re-run the focused Playwright spec and verify the new popover test passes.

### Task 4: Verification

**Files:**
- Modify: `e2e/chat-smoke.spec.ts`

- [ ] Tighten ambiguous Playwright locators that currently cause strict-mode failures unrelated to the click fixes.
- [ ] Run the focused Vitest and Playwright commands for the touched files.
- [ ] Run the full `npm run test:e2e` suite and confirm the interaction regressions stay green.
