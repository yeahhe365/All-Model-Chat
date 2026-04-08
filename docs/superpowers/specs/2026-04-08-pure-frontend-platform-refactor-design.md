# Pure Frontend Platform Refactor Design

**Date:** 2026-04-08

## Goal

Refactor `All-Model-Chat` into a maintainable pure-frontend platform that preserves existing IndexedDB and localStorage user data, fixes Gemini protocol drift, and creates clear module boundaries for future work.

## Constraints

- Pure frontend remains the primary deployment model.
- Existing chat history, session settings, saved model lists, shortcuts, and API configuration must migrate automatically and remain usable.
- Google AI Studio / zero-build mode may be downgraded or removed if it conflicts with maintainability.
- Large refactors are acceptable if they reduce long-term structural debt.

## Current Problems

- Gemini SDK usage is scattered across hooks, services, helpers, and stores.
- Live API behavior is mixed across model generations and does not match current Gemini 3.1 semantics.
- Safety defaults are more permissive than the documented Gemini defaults.
- Model capability checks depend on string matching instead of structured metadata.
- `build` can pass while `typecheck` and `lint` fail, so the repo has no trustworthy quality gate.
- Persistent data uses ad hoc compatibility logic instead of schema-driven migrations.

## Target Architecture

The refactor will reorganize the app into a layered frontend monolith:

- `src/app`
  Bootstrap, app shell, providers, boundary setup.
- `src/features/*`
  User-facing workflows such as `chat`, `live`, `files`, `settings`, `history`.
- `src/application/*`
  Use-case orchestration such as `send message`, `resume session`, `migrate persisted data`.
- `src/domain/*`
  Business models and rules without React or browser APIs.
- `src/platform/*`
  Adapters for Gemini SDK, IndexedDB, browser media APIs, notifications, and storage.
- `src/shared/*`
  Shared UI primitives and utilities with no feature ownership.

The first implementation phase will not move every file immediately. It will establish the seams and move the highest-risk integrations first.

## Data Compatibility Design

Persistent data will adopt explicit schema versioning.

- Add a persisted app schema version key.
- On startup, run `detect -> migrate -> validate -> load`.
- Migrations must be idempotent and non-destructive.
- If migration fails, preserve original data and enter a recoverable fallback mode.

### Data to Preserve

- IndexedDB chat sessions
- Per-session chat settings
- App settings
- Saved model preferences
- Shortcuts
- API config

### Compatibility Strategy

- Keep current stored shapes readable during the transition.
- Introduce normalized in-memory models first.
- Add background rewrite migrations only after normalized read/write paths are stable.

## Gemini Integration Design

Gemini integration will be consolidated behind platform adapters:

- `platform/genai/client.ts`
- `platform/genai/model-catalog.ts`
- `platform/genai/chat-api.ts`
- `platform/genai/live-api.ts`
- `platform/genai/content-mapper.ts`
- `platform/genai/safety.ts`
- `platform/genai/errors.ts`

### Model Metadata

Replace string-based capability checks with a `ModelDescriptor` structure that includes:

- `id`
- `family`
- `mode`
- `supportsThinkingLevel`
- `supportsThinkingBudget`
- `supportsLive`
- `supportsImageGeneration`
- `supportsImageEditing`
- `supportsTts`
- `supportsTranscription`
- `supportsGoogleSearch`
- `supportsCodeExecution`
- `supportsUrlContext`
- `deprecatedAt`
- `replacement`

## Live API Design

Live API handling must split by model-generation behavior.

- Gemini 3.1 Live:
  use `sendRealtimeInput` for conversational text updates and process all parts in each server event.
- Gemini 2.5 live/native-audio:
  retain compatible request/response handling where still valid.

The UI should clearly mark direct browser Live connections using long-lived API keys as less safe than ephemeral-token-backed flows.

## Safety Design

Default app behavior should follow Gemini documented defaults unless the user explicitly overrides safety settings.

- Do not eagerly send permissive `BLOCK_NONE` defaults.
- Only send request-level safety settings after user customization.
- Keep UI state expressive, but map it to API payloads only when needed.

## Quality Gates

The repo must not rely on `vite build` as the only health check.

- `build` should depend on `typecheck`.
- CI should run `test`, `typecheck`, `lint`, and `build`.
- SDK type drift should be isolated behind adapter types instead of leaking into business code.

## Migration Phases

### Phase 1

- Fix Gemini Live protocol drift.
- Fix Live multipart event parsing.
- Align safety defaults with documented behavior.
- Resolve environment variable/documentation mismatch.
- Establish adapter entry points and migration scaffolding.
- Make `typecheck` failures actionable in the touched surface.

### Phase 2

- Introduce structured model catalog and capability lookups.
- Move chat request construction into application/platform boundaries.
- Begin persistent schema migration support.

### Phase 3

- Break remaining monolithic hooks into feature/application modules.
- Reduce bundle size with lazy loading for heavyweight features.
- Remove obsolete zero-build assumptions if they continue to constrain architecture.

## Risks

- Existing uncommitted work in the main workspace may diverge from the refactor branch.
- Migration bugs could affect stored session integrity if validation is weak.
- Gemini SDK changes can still break adapter assumptions if the adapter surface is not tightly typed.
- Live API behavior differs by model family, so regression tests must cover both 2.5 and 3.1 paths.

## Success Criteria

- Existing users can open the refactored app without losing sessions or settings.
- Gemini 3.1 Live text and multipart responses behave according to current docs.
- Safety defaults match documented Gemini defaults.
- `test`, `typecheck`, `lint`, and `build` become meaningful quality gates for the touched code paths.
- New Gemini integration work can be added through adapters and model metadata instead of string matching across the codebase.
