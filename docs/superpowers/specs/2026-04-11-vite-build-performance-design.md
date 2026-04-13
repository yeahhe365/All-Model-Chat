# Vite Build Performance Design

**Date:** 2026-04-11

## Goal

Remove runtime `importmap` and CDN-based dependency loading from the app entry path, and make the production build fully owned by Vite so the bundler can control dependency graphing, chunking, and preload behavior.

## Context

The current app mixes two delivery models:

- Standard Vite SPA build
- Zero-build HTML/import-map loading for browser-only environments

That hybrid model currently keeps critical dependencies outside the Vite module graph:

- `react`, `react-dom`, `react-pdf`, `react-virtuoso`, and `xlsx` are marked as `external` in [vite.config.ts](/Users/jones/Documents/Code/All-Model-Chat/vite.config.ts)
- [index.html](/Users/jones/Documents/Code/All-Model-Chat/index.html) injects CDN scripts and styles at startup
- [index.html](/Users/jones/Documents/Code/All-Model-Chat/index.html) also defines an `importmap` for core runtime libraries

That prevents Vite from making good chunking decisions, keeps the HTML startup path heavy, and couples runtime correctness to external network resources.

## Decision

This batch will prioritize standard Vite production performance over zero-build compatibility.

The application will stop treating CDN/import-map loading as a supported primary runtime path. Production and development will both assume the normal Vite dependency pipeline.

## Scope

### 1. Entry HTML Cleanup

Update [index.html](/Users/jones/Documents/Code/All-Model-Chat/index.html) so it no longer includes:

- runtime `importmap`
- `https://cdn.tailwindcss.com`
- startup `viz.js` / `full.render.js`
- startup `html2pdf.bundle.min.js`
- other dependency-loading tags that exist only to support zero-build execution

Keep only the document shell and assets that are still valid in a Vite-owned deployment:

- metadata
- icons
- manifest
- theme variable style tag
- app root node
- Vite module entry

### 2. Recover Bundler Control in Vite

Update [vite.config.ts](/Users/jones/Documents/Code/All-Model-Chat/vite.config.ts) so Vite no longer externalizes runtime libraries that should be bundled and split normally.

This batch specifically targets recovery of:

- `react`
- `react-dom`
- `react-dom/client`
- `react/jsx-runtime`
- `react-pdf`
- `pdfjs-dist`
- `@formkit/auto-animate/react`
- `react-virtuoso`
- `xlsx`

Manual chunking stays in place for this batch. After the new build output is measured, chunk rules may be adjusted only if the recovered dependencies collapse into the main entry chunk.

### 3. Replace Global Runtime Assumptions

Any feature currently depending on globally injected browser scripts must move to module-based loading.

Known examples:

- Graphviz rendering currently assumes `window.Viz`
- HTML-to-PDF export currently assumes `window.html2pdf`

These flows should become explicit imports or dynamic imports at the point of use, so they are no longer part of the startup path.

### 4. Verification

This batch must prove two outcomes:

1. The app still builds and tests cleanly under the Vite-owned path.
2. The startup path is materially simpler and less coupled to remote runtime assets.

Verification will include:

- targeted tests for `index.html` expectations where practical
- full `npm test`
- `npm run typecheck`
- `npm run build`
- comparison of bundle output before and after the change

## Non-Goals

This batch does not include:

- preserving Google AI Studio / zero-build compatibility
- redesigning the entire chunking strategy from scratch
- removing every external stylesheet if that is not required to recover bundler control
- refactoring unrelated app features

## Expected Outcomes

- `index.html` becomes a thin shell instead of a dependency bootstrapper
- Vite regains control over key runtime dependencies
- heavy low-frequency features stop paying startup cost via global scripts
- build output becomes easier to optimize in later batches

## Risks

### Runtime regressions from previously global libraries

If code paths still rely on global objects, they will fail once the scripts are removed. This must be caught during targeted review of Graphviz and export paths.

### Bundle redistribution rather than total reduction

Recovering libraries into the Vite graph may increase some vendor chunks before follow-up chunk tuning. That is acceptable if it removes HTML-level blocking and enables future optimization.

### Styling regressions

If any current styling depends on runtime Tailwind CDN behavior rather than shipped CSS, those paths will need to be corrected as part of implementation.

## Implementation Notes

- Make the smallest change set that fully removes import-map/CDN runtime dependency assumptions.
- Keep follow-up optimization opportunities visible, but do not fold extra refactors into this batch.
- Measure the resulting build output rather than assuming it improved.
