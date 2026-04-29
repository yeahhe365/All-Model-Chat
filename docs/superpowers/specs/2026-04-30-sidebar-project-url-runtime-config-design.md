# Sidebar Project URL Runtime Config Design

## Problem

The sidebar logo link is hard-coded to `https://all-model-chat.pages.dev/`, so deployments cannot point the logo at a project-specific destination without changing source code and rebuilding.

## Selected Approach

Use the existing runtime configuration channel only. Add a `projectUrl` field to `window.__AMC_RUNTIME_CONFIG__`, expose a small helper in `src/runtime/runtimeConfig.ts`, and have `SidebarHeader` read the link target from that helper.

## Behavior

- Default the sidebar logo link to `https://all-model-chat.pages.dev/`.
- Allow deployments to override the link with `window.__AMC_RUNTIME_CONFIG__.projectUrl`.
- Treat blank string values as invalid and fall back to the default URL.
- Keep the existing logo assets, link styling, and external-link behavior unchanged.

## Components

- `public/runtime-config.js` documents and seeds the default `projectUrl`.
- `src/runtime/runtimeConfig.ts` owns parsing and fallback behavior for the runtime URL.
- `src/components/sidebar/SidebarHeader.tsx` consumes the resolved project URL instead of a hard-coded string.

## Testing

- Extend `src/runtime/runtimeConfig.test.ts` to cover default, override, and blank-string fallback behavior for `projectUrl`.
- Extend `src/components/sidebar/SidebarHeader.test.tsx` to prove the sidebar link follows the runtime-config override.
