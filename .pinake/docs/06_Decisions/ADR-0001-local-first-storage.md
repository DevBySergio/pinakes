---
title: "ADR-0001: Local First Pinake Storage"
type: adr
status: draft
order: 1
---
# ADR-0001: Local First Pinake Storage

## Status

Accepted by repository design evidence.

## Context

Pinake Editor needs documentation to be usable by humans, VS Code, scripts, and agents without relying on an external documentation service. The repository specification defines `.pinake/docs` for Markdown, `.pinake/pinake.json` for metadata, and `.pinake/.state` for generated state.

## Decision

Store Pinake documentation locally in the workspace under `.pinake/`. Keep authored Markdown under `.pinake/docs`, keep metadata in `.pinake/pinake.json`, and keep generated runtime state under `.pinake/.state`.

## Consequences

| Positive | Tradeoff |
| --- | --- |
| Docs are reviewable in Git. | Teams must decide what to commit. |
| Agents and scripts can operate on plain files. | Validation must protect path and metadata drift. |
| No hosted service is required. | Cross-repository aggregation is outside the extension. |
| Generated state can be rebuilt. | Missing state may surprise manual setups until repair runs. |

## Follow-Up

Keep `docs/public-specification.md`, schemas, runtime validation, and standalone validation aligned when the storage contract changes.
