---
title: "ADR-0001: Adopt Pinake"
type: adr
status: draft
order: 1
---

# ADR-0001: Adopt Pinake

## Status

Proposed

## Context

The workspace needs local-first documentation that stays close to source code.

## Decision Drivers

- Keep the example inspectable without external services.
- Demonstrate the manifest and Markdown contract with a small file set.
- Leave generated `.pinake/.state` files extension-owned.

## Decision

Use Pinake to store project documentation under `.pinake/docs` and track document metadata in `.pinake/pinake.json`.

## Consequences

- Documentation can be searched and validated locally.
- Generated `.pinake/.state` data remains extension-owned and ignored by default.

## Review Trigger

Revisit this ADR if the manifest schema, default storage root, or generated state contract changes.
