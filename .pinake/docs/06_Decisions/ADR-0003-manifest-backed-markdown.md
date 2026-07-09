---
title: "ADR-0003: Manifest Backed Markdown"
type: adr
status: draft
order: 3
---
# ADR-0003: Manifest Backed Markdown

## Status

Accepted by repository design evidence.

## Context

Pinake docs need to remain useful as plain Markdown while also supporting a stable TreeView, document types, statuses, ordering, and generated modules. Storing everything in Markdown frontmatter alone would make global metadata harder to validate and update. Storing Markdown bodies in JSON would make authoring and review worse.

## Decision

Use `.pinake/pinake.json` as the source of truth for document metadata and keep Markdown body content in `.pinake/docs`. Add frontmatter to Markdown files for editor/tool friendliness and warn when frontmatter drifts from the manifest.

## Consequences

| Positive | Tradeoff |
| --- | --- |
| TreeView has a single metadata source. | Manifest and frontmatter can drift after manual edits. |
| Markdown remains readable and reviewable. | Validation must compare manifest and frontmatter. |
| Manifest paths support generated module and template records. | Move/rename/delete operations must update manifest, state, and index together. |
| External tooling can inspect schemas. | Schema evolution needs compatibility care. |

## Follow-Up

When changing document metadata fields, update schemas, manifest service, validation, standalone validator, tests, and public specification together.
