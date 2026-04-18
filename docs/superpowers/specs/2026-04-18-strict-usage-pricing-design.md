# Strict Usage Pricing Design

**Date:** 2026-04-18

**Goal:** Extend the log viewer pricing system so it remains strictly exact while covering more project-supported models for all **new** usage records. Existing historical records should keep showing `—` whenever the stored fields are insufficient to reconstruct the official Google Gemini Developer API cost exactly.

## Scope

This change covers:

1. Reworking usage pricing rules so exact cost calculation is explicit per billing mode rather than only per token table.
2. Expanding the persisted usage record schema to capture the billing dimensions required for exact pricing on new requests.
3. Recording exact-billing metadata for request types already supported by the app: standard text/chat responses, TTS, audio transcription, Imagen generation, Gemini image generation, and other image-focused generation paths.
4. Updating the usage overview so price availability is driven by record completeness, not by model name alone.
5. Adding tests that prove unsupported historical records stay unavailable while new exact records calculate correctly.

This change does not cover:

1. Retroactively inferring prices for historical records.
2. Guessing missing billing dimensions from content or heuristics.
3. Converting the UI to an “estimated” pricing mode.

## Problem Summary

The current log pricing feature only prices `gemini-3.1-pro-preview`, even though many supported project models now have public official pricing. The limitation is not just the price table. The current usage record schema only stores:

- `modelId`
- prompt tokens
- cached prompt tokens
- completion tokens
- thought tokens
- tool-use prompt tokens

That schema is only sufficient for exact token-priced text generation in a narrow subset of models. It cannot exactly reproduce prices for:

- models with modality-specific input rates
- TTS models that charge for text input plus audio output
- image models that charge per generated image or image token
- live/native audio models with minute-based pricing modes

As a result, the app is currently under-reporting exact price support, while still lacking the metadata needed to safely support the richer models.

## Approaches Considered

### 1. Expand only the static pricing table

This is the smallest code change, but it would be incorrect for most models because the required billing dimensions are not persisted today. It would either silently misprice requests or force fragile heuristics. I am rejecting this.

### 2. Add a best-effort estimation layer

This would let the UI show more numbers quickly, but it violates the approved “strict exact” requirement. I am rejecting this.

### 3. Recommended: strict exact pricing with record-versioned billing metadata

Add a richer usage record format for new events, keep exact calculation rules per billing mode, and let old records remain unavailable. This preserves correctness, unlocks more models over time, and keeps the UI honest.

## Design

### 1. Record Model

Keep the existing store but version the record shape forward. New usage entries should include a compact exact-billing payload describing what the provider actually billed on that request.

Recommended fields on new records:

- `pricingVersion`
- `requestKind`
  - `text`
  - `tts`
  - `transcription`
  - `image_generate`
  - `image_edit`
- `billingDimensions`
  - token buckets by modality where exact token pricing applies
  - output image count and resolution/image-size tier where image pricing is per image
  - audio output token count where TTS pricing is token-based

The old token summary fields should stay for backwards compatibility and existing UI aggregates, but strict pricing should prefer the richer billing payload when present.

### 2. Pricing Engine

Replace the current single `TOKEN_PRICING` table with a model-rule registry that encodes exact billing semantics:

- token-only flat or tiered
- modality-split token pricing
- text-in/audio-out pricing
- image-per-output pricing

The calculator should return `null` unless the supplied record contains every field required for that model’s official billing rule.

This preserves the current strict semantics while allowing more supported models to become exact.

### 3. Capture Points

There are two major usage pipelines in the app:

- chat stream completion already writes usage metadata into `api_usage`
- TTS / image / transcription paths currently do not

The new design should add focused usage-record writers at the end of each generation path:

- `useChatStreamHandler` continues writing text/chat usage, but now includes billing metadata
- `generateSpeechApi` captures TTS input/output dimensions from the response metadata
- `transcribeAudioApi` captures transcription billing metadata when available
- `generateImagesApi` captures exact image generation counts and size tier for Imagen and Gemini image endpoints

If a provider response does not expose enough exact billing data for that model, the writer should still persist the legacy aggregate tokens but omit the exact-billing payload so price remains unavailable.

### 4. Historical Compatibility

Existing records in IndexedDB must not break. The calculator should treat records without `pricingVersion` or without the required exact-billing payload as legacy entries and return `null` unless they match the existing exact token-only path for `gemini-3.1-pro-preview`.

This means:

- old records stay readable
- totals and token aggregates still work
- price remains `—` unless exact reconstruction is possible

### 5. UI Behavior

The usage overview should keep the current strict presentation:

- show formatted USD only when every contributing record in that aggregation is exactly priceable
- show `—` otherwise
- preserve the strict-pricing note, but update its wording to mention that new records may support more exact pricing than older ones

No estimated fallback should be introduced.

## Supported Model Targets

The intended exact-pricing support after this change is:

- `gemini-3.1-pro-preview`
- token-priced text-only models whose exact billed token buckets can be derived from stored metadata
- TTS models only if the response exposes exact text/audio billing buckets
- Imagen and Gemini image models only if we can persist exact image-count and size-tier dimensions per request

Models with official pricing but insufficient API telemetry should remain unavailable until the provider response exposes enough exact fields.

## Error Handling

- If a response omits exact billing dimensions, persist the request as legacy-compatible usage without price metadata.
- If the calculator encounters an unknown pricing version or unknown billing rule, return `null`.
- If mixed records are aggregated for a model and any record is not exactly priceable, that aggregate should remain unavailable.

## Testing

Add coverage for:

1. exact pricing for current `gemini-3.1-pro-preview` legacy-compatible records
2. exact pricing for new billing-dimension records where enough data exists
3. `null` for legacy records missing required dimensions
4. `null` for models whose official rule requires fields we still do not store
5. usage writers for chat, TTS, transcription, and image generation creating the correct record shape

## Implementation Notes

- Prefer additive schema evolution over destructive migration.
- Keep the log viewer aggregate math stable for requests/tokens even when price is unavailable.
- Do not invent a price from prompt text, selected model type, or UI mode alone.
