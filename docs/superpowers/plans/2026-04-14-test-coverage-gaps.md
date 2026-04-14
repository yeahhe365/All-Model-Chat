# Test Coverage Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-risk validation gaps by adding reconnection regression tests, worker-isolated tests, and a first runnable browser E2E path.

**Architecture:** Keep the existing Vitest stack for unit and integration coverage, but introduce small test seams around worker creation so browser-only behavior can be verified without running real workers in jsdom. Add Playwright as a separate black-box layer for end-to-end browser validation, starting with one smoke path that exercises real UI behavior without depending on live third-party APIs.

**Tech Stack:** Vitest, jsdom, React 18, TypeScript, Playwright

---

### Task 1: Cover Live API Reconnect Backoff

**Files:**
- Modify: `src/hooks/live-api/useLiveConnection.test.tsx`

- [ ] Add a failing test that closes the live session unexpectedly and asserts the hook schedules a reconnect after `1000ms`.
- [ ] Add a failing test that triggers repeated failures and asserts the delay sequence grows exponentially (`1000`, `2000`, `4000`, ...), capped by the existing retry limit.
- [ ] Add a failing test that verifies manual `disconnect()` cancels a pending reconnect timeout and does not re-enter the reconnect loop.
- [ ] Run `npm test -- src/hooks/live-api/useLiveConnection.test.tsx` and confirm the new assertions fail for the intended reason before implementation changes.
- [ ] Make the smallest production change needed only if the new tests expose a real bug.
- [ ] Re-run `npm test -- src/hooks/live-api/useLiveConnection.test.tsx`.

### Task 2: Add Worker-Isolated Pyodide Service Tests

**Files:**
- Modify: `src/services/pyodideService.ts`
- Create: `src/services/pyodideService.test.ts`

- [ ] Add a small exported test seam around worker creation and worker code generation without changing runtime behavior.
- [ ] Write a failing test that verifies the worker URL is built from `document.baseURI` and the placeholder `__PYODIDE_BASE_URL__` is replaced in the worker script.
- [ ] Write a failing test that verifies `mountFiles()` transfers raw file buffers and resolves after a synthetic `MOUNT_COMPLETE` worker response.
- [ ] Write a failing test that verifies `runPython()` rejects on timeout and resolves with `{ output, image, files, result }` when the worker posts a success payload.
- [ ] Run `npm test -- src/services/pyodideService.test.ts` to watch the new cases fail correctly.
- [ ] Implement the minimal production/test-seam changes needed to satisfy the tests.
- [ ] Re-run `npm test -- src/services/pyodideService.test.ts`.

### Task 3: Add Worker-Isolated Audio Compression Tests

**Files:**
- Modify: `src/utils/audioCompression.ts`
- Create: `src/utils/audioCompression.test.ts`

- [ ] Add a small exported seam for worker code creation or worker construction so the compression path can be simulated in Vitest.
- [ ] Write a failing test that verifies tiny files bypass compression and return the original file.
- [ ] Write a failing test that verifies a worker success message returns an `.mp3` file with `audio/mpeg`.
- [ ] Write a failing test that verifies worker error or `onerror` falls back to the original audio payload.
- [ ] Write a failing test that verifies aborting the signal tears down the worker and rejects with `AbortError`.
- [ ] Run `npm test -- src/utils/audioCompression.test.ts` and confirm the failures are meaningful.
- [ ] Implement the minimal seam/runtime changes needed to make the tests pass.
- [ ] Re-run `npm test -- src/utils/audioCompression.test.ts`.

### Task 4: Add Browser E2E Infrastructure

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/chat-smoke.spec.ts`
- Modify: `src/test/setup.ts` only if shared test helpers need browser-safe globals

- [ ] Add Playwright as a dev dependency and add scripts for `test:e2e` and `test:e2e:headed`.
- [ ] Create a Playwright config that starts the Vite dev server, uses Chromium by default, and writes reports to the repo-local output folder.
- [ ] Add a first smoke test that opens the app, finds the chat input by `aria-label="Chat message input"`, enters text, and verifies the basic shell is interactive.
- [ ] If a fully black-box Canvas or Pyodide path can be mocked reliably through network interception or seeded local state, extend the smoke test with one such path; otherwise document that this first commit only establishes the runnable E2E harness.
- [ ] Run `npx playwright test e2e/chat-smoke.spec.ts` (or `npm run test:e2e -- e2e/chat-smoke.spec.ts`) and confirm the new test fails before any supporting changes.
- [ ] Implement the minimal supporting changes needed for the browser test to pass.
- [ ] Re-run the E2E command and confirm it passes.

### Task 5: Final Verification

**Files:**
- Modify: `README.md` only if test commands need to be documented

- [ ] Run `npm test -- src/hooks/live-api/useLiveConnection.test.tsx`.
- [ ] Run `npm test -- src/services/pyodideService.test.ts`.
- [ ] Run `npm test -- src/utils/audioCompression.test.ts`.
- [ ] Run `npm run test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:e2e -- e2e/chat-smoke.spec.ts`.
- [ ] Summarize what is now covered by unit/integration tests vs. the remaining E2E risk that still depends on external API behavior.
