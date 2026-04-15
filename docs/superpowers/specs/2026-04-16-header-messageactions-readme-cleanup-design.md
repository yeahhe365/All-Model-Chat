# Header MessageActions And README Cleanup Design

**Date:** 2026-04-16

**Goal**

Remove the next safest prop-chain redundancies after the certain-redundancy batch, and align README with the actual Vite-first runtime model.

**Scope**

- Remove `Header` prop-chain fields that are passed through but not used by the rendered header:
  - `onOpenSettingsModal`
  - `isKeyLocked`
- Remove `MessageActions` prop-chain fields that are passed through but not used by the rendered message actions:
  - `onTextToSpeech`
  - `ttsMessageId`
- Delete outdated README statements that still describe import maps, CDN runtime ownership, Tailwind CDN styling, and zero-build as an active path.

**Approach**

1. Add source guard tests for the exact prop names and obsolete README phrases.
2. Remove the dead fields from `Header`, `MessageActions`, and only the minimum upstream types/call sites needed to compile.
3. Rewrite README sections so they describe the current Vite build + optional server deployment model without mentioning importmap/CDN runtime loading as the current architecture.

**Verification**

- Run focused guard tests first.
- Then run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
