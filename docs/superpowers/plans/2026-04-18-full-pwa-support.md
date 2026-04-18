# Full PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full installable PWA support with offline app-shell caching, update prompts, stronger install UX, real icon assets, and regression coverage.

**Architecture:** Integrate `vite-plugin-pwa` in `injectManifest` mode, keep service worker logic in dedicated `src/pwa/` modules, thread install/update state through `useAppEvents`, and validate the contract with focused unit tests plus a production build check.

**Tech Stack:** Vite 5, React 18, TypeScript, vite-plugin-pwa, Workbox injectManifest, Vitest, Tailwind CSS

---

### Task 1: Lock The PWA Contract With Failing Tests

**Files:**
- Create: `src/pwa/install.test.ts`
- Create: `src/pwa/register.test.ts`
- Create: `src/__tests__/manifest.test.ts`
- Modify: `src/components/settings/sections/DataManagementSection.test.tsx`

- [ ] **Step 1: Add a manifest test that fails unless the manifest references real icon files and includes scope metadata**
- [ ] **Step 2: Add install-state tests for deferred prompt, standalone mode, and manual-install fallback**
- [ ] **Step 3: Add registration tests that fail unless production registration exposes `needRefresh` and `offlineReady` hooks**
- [ ] **Step 4: Add a settings test that fails unless the install CTA remains actionable or informative when no deferred prompt exists**
- [ ] **Step 5: Run the focused PWA tests and confirm they fail for the expected reasons**

### Task 2: Add Build-Time PWA Integration

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/pwa/sw.ts`
- Create: `src/pwa/register.ts`

- [ ] **Step 1: Install and wire `vite-plugin-pwa` with `injectManifest` mode**
- [ ] **Step 2: Configure precache inputs and runtime exclusions for `/api/` and `runtime-config.js`**
- [ ] **Step 3: Implement the service worker with app-shell navigation fallback and safe runtime cache rules**
- [ ] **Step 4: Implement the registration helper used by the React runtime**
- [ ] **Step 5: Run the registration tests and a production build to confirm PWA artifacts are emitted**

### Task 3: Upgrade Install And Update UX

**Files:**
- Modify: `src/hooks/core/useAppEvents.ts`
- Create: `src/pwa/install.ts`
- Create: `src/components/pwa/PwaUpdateBanner.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/settings/sections/DataManagementSection.tsx`

- [ ] **Step 1: Expand install-state handling so standalone detection and manual-install guidance are covered**
- [ ] **Step 2: Thread update-state and refresh callbacks from the PWA registration helper into app state**
- [ ] **Step 3: Render a lightweight update banner with refresh and dismiss actions**
- [ ] **Step 4: Update the settings install row so unsupported deferred-prompt browsers get guidance instead of a dead disabled button**
- [ ] **Step 5: Run focused hook/component tests to confirm the updated UX**

### Task 4: Replace Manifest Data URIs With Real App Assets

**Files:**
- Create: `public/pwa-192.png`
- Create: `public/pwa-512.png`
- Create: `public/pwa-512-maskable.png`
- Modify: `manifest.json`
- Modify: `index.html`

- [ ] **Step 1: Generate real icon assets that match the current app branding**
- [ ] **Step 2: Update the manifest to reference the new files and include `scope`**
- [ ] **Step 3: Update HTML icon tags to use stable asset paths**
- [ ] **Step 4: Run the manifest tests and production build again**

### Task 5: Verify The End-To-End PWA Surface

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verify focused Vitest suites pass**
- [ ] **Step 2: Run `npm run build` and confirm service worker artifacts are present**
- [ ] **Step 3: Update README PWA wording so it matches the new behavior**
- [ ] **Step 4: Summarize residual limitations clearly, especially that chat generation still requires network access**
