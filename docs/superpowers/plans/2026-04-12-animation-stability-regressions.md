# Animation Stability Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the confirmed animation and auto-scroll race conditions without entangling unrelated in-flight refactors in the working tree.

**Architecture:** Fix each regression at the source of truth instead of layering more timers on top. For scrolling, distinguish real user scroll intent from layout-induced scroll events. For modal teardown, let the DOM animation lifecycle decide when the portal unmounts. For theme transitions, reduce the selector blast radius so theme changes do not force the whole tree into color transitions.

**Tech Stack:** React 18, TypeScript, Vitest, jsdom, CSS animations.

---

### Task 1: Stabilize Code Block Auto-Follow

**Files:**
- Modify: `src/hooks/ui/useCodeBlock.ts`
- Test: `src/hooks/ui/useCodeBlock.test.tsx`

- [x] **Step 1: Write the failing regression test**

```tsx
it('keeps following the bottom when layout growth fires a scroll event without user scroll intent', () => {
  // Render once, grow the content, simulate a layout shift that keeps scrollTop stable,
  // then grow again and assert the hook still scrolls to the new bottom.
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/hooks/ui/useCodeBlock.test.tsx`
Expected: FAIL because the hook marks `userHasScrolledUp` during a layout-driven scroll event.

- [x] **Step 3: Implement the minimal fix**

```ts
const lastKnownScrollTop = useRef(0);

const handleScroll = useCallback(() => {
  const el = preRef.current;
  if (!el) return;

  const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 25;
  const scrolledUp = el.scrollTop < lastKnownScrollTop.current;

  if (isAtBottom) {
    userHasScrolledUp.current = false;
  } else if (scrolledUp) {
    userHasScrolledUp.current = true;
  }

  lastKnownScrollTop.current = el.scrollTop;
}, []);
```

- [x] **Step 4: Re-run the focused test**

Run: `npm test -- src/hooks/ui/useCodeBlock.test.tsx`
Expected: PASS

### Task 2: Make Modal Exit Event-Driven

**Files:**
- Modify: `src/components/shared/Modal.tsx`
- Test: `src/components/shared/Modal.test.tsx`

- [x] **Step 1: Rewrite the teardown test around animation events**

```tsx
it('stays mounted until the exit animation ends', () => {
  // Close the modal, assert it stays mounted, then dispatch animationend and assert unmount.
});
```

- [x] **Step 2: Run the focused modal tests to verify the exit test fails**

Run: `npm test -- src/components/shared/Modal.test.tsx`
Expected: FAIL because the component still depends on the fixed-duration timeout.

- [x] **Step 3: Replace timeout-based close logic with animation-end handling**

```tsx
useEffect(() => {
  if (isOpen) {
    setIsActuallyOpen(true);
  }
}, [isOpen]);

const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
  if (event.target === event.currentTarget && !isOpen) {
    setIsActuallyOpen(false);
  }
};
```

- [x] **Step 4: Re-run the focused modal tests**

Run: `npm test -- src/components/shared/Modal.test.tsx`
Expected: PASS

### Task 3: Narrow Theme Transition Scope

**Files:**
- Modify: `src/styles/main.css`
- Test: `src/__tests__/animations.test.ts`

- [x] **Step 1: Extend the CSS guardrail test**

```ts
it('limits theme color transitions to dedicated surfaces instead of broad layout selectors', () => {
  // Assert the old broad selector list is gone and the dedicated transition class remains.
});
```

- [x] **Step 2: Run the focused animation guardrail tests to verify they fail**

Run: `npm test -- src/__tests__/animations.test.ts`
Expected: FAIL because the broad selector list is still present in `main.css`.

- [x] **Step 3: Reduce the global selector list**

```css
body,
#root,
.theme-transition-colors {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

- [x] **Step 4: Re-run the focused animation guardrail tests**

Run: `npm test -- src/__tests__/animations.test.ts`
Expected: PASS

### Task 4: Document Investigated Non-Issues Before Further Refactors

**Files:**
- Modify: `docs/superpowers/plans/2026-04-12-animation-stability-regressions.md`

- [x] **Step 1: Record current findings about the upload animation claim**

```md
- `src/services/api/fileApi.ts` now uses the SDK uploader and only invokes `onProgress` once at completion, so the previously reported high-frequency progress churn is not reproducible in the current code.
```

- [x] **Step 2: Record current findings about the welcome typewriter timer**

```md
- The current effect schedules at most one timeout per render pass and cleans that timeout in the effect cleanup, so no failing reproduction was found yet for the reported leak.
```

- [x] **Step 3: Verify the notes are present before wrapping up**

Run: `sed -n '1,220p' docs/superpowers/plans/2026-04-12-animation-stability-regressions.md`
Expected: includes both investigation notes so future work can pick up without re-tracing the same assumptions

## Investigation Notes

- `src/services/api/fileApi.ts` now uploads through the official SDK and only calls `onProgress` once at completion, so the earlier high-frequency `setSelectedFiles` churn described around file upload progress is not reproducible in the current implementation.
- `src/components/chat/message-list/WelcomeScreen.tsx` currently schedules at most one timeout per effect pass and clears that timeout in the effect cleanup, so no failing reproduction has been found yet for the reported timer leak. It should be revisited only with a concrete reproduction.
