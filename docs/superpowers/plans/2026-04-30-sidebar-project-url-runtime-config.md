# Sidebar Project URL Runtime Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sidebar logo link configurable through runtime-config without introducing any `.env` dependency.

**Architecture:** Extend the existing runtime-config parser with a `projectUrl` reader and default constant, then have `SidebarHeader` consume that resolved value. Keep the change isolated to runtime config, sidebar rendering, and focused tests.

**Tech Stack:** React 18, TypeScript, Vitest, Vite runtime config bootstrap.

---

### Task 1: Add Failing Coverage For Runtime Project URL

**Files:**
- Modify: `src/runtime/runtimeConfig.test.ts`
- Modify: `src/components/sidebar/SidebarHeader.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add runtime-config assertions for default URL, runtime override URL, and blank-string fallback. Add a sidebar header test that sets `window.__AMC_RUNTIME_CONFIG__.projectUrl` and expects the rendered anchor to use that URL.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/runtime/runtimeConfig.test.ts src/components/sidebar/SidebarHeader.test.tsx`

Expected: FAIL because `runtimeConfig` does not yet expose a project URL helper and `SidebarHeader` still renders the hard-coded URL.

### Task 2: Implement Runtime Config Support

**Files:**
- Modify: `public/runtime-config.js`
- Modify: `src/runtime/runtimeConfig.ts`
- Modify: `src/components/sidebar/SidebarHeader.tsx`

- [ ] **Step 1: Add the runtime-config field**

Seed `projectUrl` in `public/runtime-config.js` with the current production URL so deployments can override it in-place.

- [ ] **Step 2: Add the runtime-config helper**

Expose a `getProjectUrl()` helper and default constant from `src/runtime/runtimeConfig.ts`. Reuse existing string parsing so blank values fall back to the default URL.

- [ ] **Step 3: Update the sidebar header**

Replace the hard-coded anchor `href` in `SidebarHeader` with the resolved runtime-config value.

- [ ] **Step 4: Re-run focused tests**

Run: `npm test -- src/runtime/runtimeConfig.test.ts src/components/sidebar/SidebarHeader.test.tsx`

Expected: PASS.

### Task 3: Final Verification

**Files:**
- Modify: `public/runtime-config.js`
- Modify: `src/runtime/runtimeConfig.ts`
- Modify: `src/runtime/runtimeConfig.test.ts`
- Modify: `src/components/sidebar/SidebarHeader.tsx`
- Modify: `src/components/sidebar/SidebarHeader.test.tsx`

- [ ] **Step 1: Run targeted type-safe verification**

Run: `npm run typecheck`

Expected: exit code `0`.
