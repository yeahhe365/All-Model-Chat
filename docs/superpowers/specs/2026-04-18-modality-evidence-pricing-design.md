# Modality Evidence Pricing Design

**Date:** 2026-04-18

**Goal:** Make pricing availability consistent across all models by requiring modality evidence for every priced request, while allowing pure-text chat requests to record `TEXT -> TEXT` evidence locally so strict pricing works for plain Gemini chat conversations.

## Scope

This change covers:

1. Removing the legacy token-only fallback path that still prices `gemini-3.1-pro-preview` without explicit modality evidence.
2. Treating all priceable models under one strict rule: no price unless exact billing evidence exists on the stored usage record.
3. Synthesizing exact pricing evidence for pure-text chat requests when the app can prove both request and response are text-only from local request/response data.
4. Preserving `—` for historical records and for any request containing files, mixed modalities, or incomplete evidence.

This change does not cover:

1. Guessing modality evidence for historical records.
2. Inferring audio/image/video billing from token totals.
3. Relaxing strict exact mode.

## Problem Summary

The current strict-pricing system is inconsistent:

- most models require `exactPricing` evidence
- `gemini-3.1-pro-preview` still has a legacy fallback that prices from token totals alone
- pure-text `gemini-3-flash-preview` and `gemini-3.1-flash-lite-preview` requests often remain unavailable because the SDK does not always provide modality token details, even though the app itself knows the request and response are plain text

This makes the UI confusing. A plain-text Pro chat shows a price, while a plain-text Flash chat with equally trustworthy local evidence can still show `—`.

## Design

### 1. Unified Strict Rule

All models should use the same rule:

- if a record has exact modality/billing evidence, price it
- otherwise, show unavailable

That means the old token-only fallback for `gemini-3.1-pro-preview` should be removed. Historical Pro records without evidence will become unavailable, matching the rest of the system.

### 2. Pure-Text Evidence Synthesis

When a chat request is provably text-only, the app should create the missing modality evidence itself.

Evidence can be synthesized only when all of the following are true:

- the outbound request parts are text-only
- the final model response contains text/thought/tool-result text only
- no inline media output is present
- no uploaded files, audio, images, or other multimodal parts are involved

In that case, the app can safely store:

- prompt modality: `TEXT`
- response modality: `TEXT`
- cache modality: `TEXT` when cached prompt tokens exist
- tool-use prompt modality: `TEXT` when tool prompt tokens exist

This is still strict because the evidence comes from concrete request/response structure, not from heuristics or averages.

### 3. Capture Boundary

The best place to synthesize pure-text chat evidence is the chat-stream completion path, because it already has:

- original request parts
- accumulated response parts
- usage metadata totals

The implementation should add a focused helper that inspects these inputs and returns exact pricing metadata only when the conversation is text-only.

### 4. Historical Compatibility

Historical records should remain readable but may lose pricing if they relied on the old Pro-only fallback. This is intentional and matches the approved “all models require modality evidence” rule.

## Testing

Add or update coverage for:

1. `gemini-3.1-pro-preview` legacy records without exact pricing now return `null`
2. pure-text Flash chat records are exactly priced when local text-only evidence is synthesized
3. pure-text Pro chat records are exactly priced through the same synthesized evidence path
4. requests with files or non-text parts still remain unavailable unless the SDK provides exact details

## Implementation Notes

- Keep the change narrow: only pure-text chat gets local synthesis in this pass.
- Do not synthesize image/audio/video evidence yet.
- Update the strict-pricing note to reflect that evidence may come from provider metadata or proven local text-only request/response structure.
