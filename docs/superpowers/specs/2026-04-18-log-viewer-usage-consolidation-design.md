# Log Viewer Usage Consolidation Design

**Date:** 2026-04-18

**Goal:** Remove the dedicated Usage tab from Settings and make the log viewer the single place where users inspect console logs, request-level usage summaries, token totals, and API key distribution.

## Scope

This change covers:

1. Removing the Settings sidebar `usage` tab and its render path.
2. Turning the log viewer into a two-level navigation surface with `Console` and `Usage` top-level tabs.
3. Moving the current settings usage dashboard into the log viewer as `Usage > Overview`.
4. Folding the existing `Token Usage` and `API Usage` views under the same `Usage` area as `Usage > Tokens` and `Usage > API Keys`.
5. Updating the Settings data page entry point so users open the combined log-and-usage surface intentionally.

This change does not cover:

1. Changing how token usage records are persisted.
2. Adding charts, exports, or new pricing logic.
3. Changing IndexedDB schema versions or `logService` storage keys.

## Problem Summary

The app currently exposes usage information in two separate places:

- Settings contains a full request-level usage dashboard backed by IndexedDB time-range queries.
- The log viewer contains separate `Token Usage` and `API Usage` tabs backed by live `logService` aggregates.

This splits the user mental model. Users have to know whether they want "settings usage" or "log usage", even though both describe the same activity. The consolidation should preserve both levels of detail while giving them a single home.

## Approach

### 1. Information Architecture

The log viewer becomes the only usage entry point.

Top-level tabs:

- `Console`
- `Usage`

Nested usage tabs:

- `Overview`
- `Tokens`
- `API Keys` when `useCustomApiConfig` is enabled

This preserves the fast developer-style console view while grouping all usage-related views behind a single top-level concept.

### 2. Component Structure

Keep the existing `LogViewer` modal as the shell, but simplify its top-level state:

- replace the current `console | tokens | api` top-level tab state
- add `console | usage` as the new top-level state
- add a nested usage sub-tab state for `overview | tokens | api`

The current settings-only usage section should be moved into the log viewer domain as a reusable usage overview component rather than continuing to live under Settings. The simplest structure is:

- `src/components/log-viewer/UsageOverviewTab.tsx`
- existing `TokenUsageTab.tsx`
- existing `ApiUsageTab.tsx`

`useUsageStats` remains the data hook for the overview because it already encapsulates time-range loading and aggregation cleanly.

### 3. Settings Surface Changes

Settings should no longer advertise usage as a first-class category.

Required changes:

- remove `usage` from the `SettingsTab` union and valid-tab fallback logic
- remove the usage tab registration from the settings sidebar model
- remove the `UsageSection` render branch from `SettingsContent`
- update any settings navigation tests that currently assert the presence of the usage tab

The data-management page should still expose the log viewer, but the copy should indicate that usage now lives there too.

### 4. Entry-Point Behavior

The current `onOpenLogViewer` flow only opens the modal. It does not express which part of the log viewer should be shown first.

To support the new unified structure cleanly, the log viewer open action should accept optional initial state:

- initial top-level tab: `console | usage`
- initial usage sub-tab: `overview | tokens | api`

Recommended default behavior:

- Settings data page button opens `Usage > Overview`
- existing generic log entry points keep opening `Console`

This lets the Settings page remain a useful navigation origin without keeping duplicate content there.

### 5. Data Flow And Refresh Rules

The consolidated usage area will still rely on two existing data sources:

- `Usage > Overview` reads IndexedDB `api_usage` records through `useUsageStats`
- `Usage > Tokens` and `Usage > API Keys` read live aggregate maps from `logService`

Those sources should stay separate for this change to keep scope controlled. However, the UI needs a clearer refresh contract because live maps can update before the IndexedDB overview reloads.

Recommended behavior:

- keep `TokenUsageTab` and `ApiUsageTab` live via subscriptions
- trigger an overview reload whenever a new usage record is written or when the user switches back to `Overview`
- ensure `clearLogs()` resets all three usage subviews immediately

This is enough to keep the consolidated surface feeling coherent without rewriting the storage model.

### 6. Copy And Localization

The current overview strings already use the i18n settings translation bundle, while the log viewer usage tabs still contain hard-coded English headings and empty states.

As part of the move:

- reuse the existing usage translation keys for the overview
- add log-viewer usage labels to i18n for `Console`, `Usage`, `Overview`, `Tokens`, `API Keys`, empty states, and button copy
- update the Settings data-page "view logs" label to reflect that usage is now included

This avoids a mixed Chinese/English experience after consolidation.

## Error Handling

- If IndexedDB usage loading fails, `Usage > Overview` should continue to show the existing empty-state fallback rather than blocking the rest of the log viewer.
- If API key usage is unavailable because custom API config is disabled, hide the `API Keys` sub-tab entirely instead of rendering an empty panel.
- If logs and usage are cleared while the viewer is open, all three subviews should reset in-place without requiring the modal to close and reopen.

## Testing

Add or update coverage for:

1. `useSettingsLogic` no longer exposing the `usage` tab.
2. Settings content no longer rendering a usage section branch.
3. Log viewer top-level tab switching between `Console` and `Usage`.
4. Usage nested tab switching between `Overview`, `Tokens`, and `API Keys`.
5. `Usage > Overview` preserving current request aggregation and price-display behavior after relocation.
6. `API Keys` sub-tab hiding correctly when custom API config is disabled.
7. `clearLogs()` clearing console logs, token totals, API key distribution, and overview content together.

## Implementation Notes

- Prefer moving the existing usage overview markup instead of duplicating it.
- Keep `useUsageStats` in `src/hooks/features/` unless a stronger log-viewer-only dependency emerges.
- Maintain current pricing behavior and "strict official mode" note exactly; this move is architectural, not a pricing redesign.
- The final log viewer should read as one cohesive surface, not as the old three tabs plus an extra dashboard.
