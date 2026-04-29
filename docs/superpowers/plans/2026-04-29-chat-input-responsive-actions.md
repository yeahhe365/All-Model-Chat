# Chat Input Responsive Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent chat composer action buttons from overflowing by moving auxiliary actions into a compact more menu.

**Architecture:** `ChatInputActions` keeps ownership of action grouping. `SendControls` renders send-specific actions only, while a new `ComposerMoreMenu` renders compact auxiliary actions through the existing portaled menu helper.

**Tech Stack:** React 18, TypeScript, Vitest, lucide-react, existing Tailwind-style utility classes.

---

### Task 1: Responsive Auxiliary Action Menu

**Files:**
- Create: `src/components/chat/input/actions/ComposerMoreMenu.tsx`
- Modify: `src/components/chat/input/ChatInputActions.tsx`
- Modify: `src/components/chat/input/actions/SendControls.tsx`
- Test: `src/components/chat/input/ChatInputActions.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test to `src/components/chat/input/ChatInputActions.test.tsx` that renders with paste, clear, translate, fullscreen, and queue enabled. Expect the queue control to remain with send props, and expect auxiliary controls to be available through a more menu rather than direct `SendControls` props.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/chat/input/ChatInputActions.test.tsx`

Expected: FAIL because `ComposerMoreMenu` does not exist and auxiliary actions still flow through `SendControls` or direct utility controls only.

- [ ] **Step 3: Implement the menu and regroup actions**

Create `ComposerMoreMenu.tsx` with a portaled menu using `usePortaledMenu`. Update `ChatInputActions.tsx` so auxiliary actions render directly on `sm` and larger screens, and render through `ComposerMoreMenu` on compact screens. Update `SendControls.tsx` to remove paste and clear rendering.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/components/chat/input/ChatInputActions.test.tsx src/components/chat/input/actions/SendControls.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run broader verification**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.
