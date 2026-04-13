# Vite Build Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove runtime import-map/CDN dependency loading from the app and make the production path fully Vite-owned.

**Architecture:** Strip startup HTML down to a thin shell, recover Vite ownership over previously externalized runtime libraries, and replace global script assumptions with module or dynamic-module loading at the feature boundary. Verify both correctness and bundle output after each scoped change.

**Tech Stack:** Vite 5, React 18, TypeScript, Vitest, React PDF, Graphviz/Viz, html2pdf.js

---

### Task 1: Lock Entry-Path Expectations With Tests

**Files:**
- Create: `src/__tests__/indexHtml.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write the failing test**

Create a test that reads `/Users/jones/Documents/Code/All-Model-Chat/index.html` and asserts that it no longer contains:

- `type="importmap"`
- `https://cdn.tailwindcss.com`
- `viz.js`
- `html2pdf.bundle.min.js`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/indexHtml.test.ts`
Expected: FAIL because the current `index.html` still includes those strings.

- [ ] **Step 3: Implement minimal test support if needed**

If the test needs Node file access setup, use the existing Vitest jsdom environment and `fs.readFileSync` directly rather than changing runtime code.

- [ ] **Step 4: Run test again after support changes**

Run: `npm test -- src/__tests__/indexHtml.test.ts`
Expected: Still FAIL, but now for the intended assertions only.

### Task 2: Remove HTML-Level Runtime Bootstrapping

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove the failing HTML dependencies**

Delete the import map and startup CDN scripts from `index.html`, leaving only the document shell, existing app stylesheet entry points that are still valid, manifest/icons/meta, root node, and `/src/index.tsx`.

- [ ] **Step 2: Run the HTML expectation test**

Run: `npm test -- src/__tests__/indexHtml.test.ts`
Expected: PASS

- [ ] **Step 3: Build once to expose next-layer dependency breakage**

Run: `npm run build`
Expected: Likely FAIL or warn if runtime code still assumes globally injected libraries.

### Task 3: Recover Vite Ownership of Externalized Runtime Libraries

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Remove no-longer-needed `external` runtime libraries**

Delete the `rollupOptions.external` entries for:

- `react`
- `react-dom`
- `react-dom/client`
- `react/jsx-runtime`
- `react-pdf`
- `pdfjs-dist`
- `@formkit/auto-animate/react`
- `react-virtuoso`
- `xlsx`

- [ ] **Step 2: Keep existing manual chunk rules intact**

Do not refactor chunking broadly in this batch. Only add a new manual chunk grouping if a recovered dependency clearly collapses into the main entry chunk.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, or expose import/runtime assumptions that must be fixed in the next tasks.

### Task 4: Replace Global Graphviz Runtime Assumptions

**Files:**
- Modify: `src/components/message/blocks/GraphvizBlock.tsx`
- Create: `src/components/message/blocks/GraphvizBlock.test.tsx` if needed

- [ ] **Step 1: Write a failing test or minimal reproduction**

Prefer a component-level test that verifies Graphviz initialization no longer depends on `window.Viz` being preloaded globally. If a direct unit test is too expensive, use build failure as the reproduction evidence and document it in the implementation notes.

- [ ] **Step 2: Run the reproduction**

Run the targeted test or `npm run build`.
Expected: FAIL because Graphviz currently assumes a global `Viz`.

- [ ] **Step 3: Implement module-based loading**

Replace the global `Viz` polling logic with explicit module loading, ideally lazy-loaded within the component so Graphviz still stays off the startup path.

- [ ] **Step 4: Verify Graphviz path**

Run the targeted test if added, otherwise run: `npm run build`
Expected: PASS for the Graphviz-related failure mode.

### Task 5: Replace Global html2pdf Runtime Assumptions

**Files:**
- Modify: `src/hooks/useCreateFileEditor.ts`
- Create: `src/hooks/useCreateFileEditor.test.ts` or `src/hooks/useCreateFileEditor.test.tsx` if practical

- [ ] **Step 1: Write a failing test or minimal reproduction**

Prefer a focused test around PDF export path setup that proves the code no longer requires `window.html2pdf`. If that is disproportionately expensive, use build/runtime dependency analysis plus a targeted helper-level test for lazy loader behavior.

- [ ] **Step 2: Run the reproduction**

Run the targeted test or `npm run build`.
Expected: FAIL or rely on current code inspection evidence showing `window.html2pdf` dependency.

- [ ] **Step 3: Implement on-demand module loading**

Refactor PDF generation/export calls to load `html2pdf.js` through dynamic import at the point of use instead of expecting a global script.

- [ ] **Step 4: Verify PDF export path**

Run the targeted test if added, otherwise run: `npm run typecheck`
Expected: PASS

### Task 6: Full Verification and Output Comparison

**Files:**
- Modify: `README.md` only if it still documents zero-build/import-map as a supported path

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Compare bundle output**

Capture the main entry chunk size and verify whether:

- the import-map/CDN warning path is gone
- previously externalized libraries are now Vite-owned
- the main entry chunk is redistributed into clearer vendor chunks

- [ ] **Step 5: Commit**

```bash
git add index.html vite.config.ts src docs/superpowers/specs/2026-04-11-vite-build-performance-design.md docs/superpowers/plans/2026-04-11-vite-build-performance.md README.md
git commit -m "perf: return app runtime to vite bundle"
```
