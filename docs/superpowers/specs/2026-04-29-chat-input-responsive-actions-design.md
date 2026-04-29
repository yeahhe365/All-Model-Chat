# Chat Input Responsive Actions Design

## Problem

The chat composer action row can overflow horizontally when several optional buttons are enabled at the same time. The current layout keeps the left action group and the right action group on one line, so narrow screens or feature-heavy states can push buttons outside the viewport.

## Selected Approach

Use a responsive mixed layout. Keep primary actions directly visible and move lower-frequency auxiliary actions into a more menu on compact widths. This preserves desktop efficiency while preventing mobile and narrow-width overflow.

## Behavior

- Keep attachment, tools, recording or Live controls, edit cancel, queue, stop, and send actions in the main action row when they are relevant.
- Move auxiliary composer actions into a more menu on compact widths:
  - fullscreen toggle
  - input translation
  - paste from clipboard
  - clear input
- Keep auxiliary actions directly visible on wider screens.
- Preserve existing disabled states, labels, titles, and handlers.
- Use the existing portaled menu pattern so the menu can escape the composer container and remain within the viewport.

## Components

- `ChatInputActions.tsx` owns the responsive grouping decision and passes the correct props to direct controls and overflow controls.
- `SendControls.tsx` stays focused on send-related actions.
- `ComposerMoreMenu.tsx` renders the compact-width auxiliary action menu.
- Existing `UtilityControls.tsx` remains the direct desktop rendering path for fullscreen and translation.

## Testing

Add component tests that prove the auxiliary controls move behind a more menu while primary send controls remain direct. Run the focused chat input action tests after implementation.
