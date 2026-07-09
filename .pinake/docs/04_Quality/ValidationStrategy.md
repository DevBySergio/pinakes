---
title: "Validation Strategy"
type: testing
status: draft
order: 3
---
# Validation Strategy

## Validation Flow

Runtime validation starts by checking required Pinake entries, then validates JSON files against runtime schemas, then validates manifest-backed documents, ADR names, Markdown links, Markdown style, and secret hygiene. The standalone CLI mirrors the same categories.

## Required Entries

| Entry | Required for validation |
| --- | --- |
| `.pinake` | Yes |
| `.pinake/pinake.json` | Yes |
| `.pinake/docs` | Yes |
| `.pinake/.state/modules.json` | Yes |
| `.pinake/.state/ui.json` | Yes |
| `.pinake/.state/indexes.json` | Yes |
| `.pinake/.state/migrations.json` | Yes |
| `.pinake/.state/version.json` | Yes |

## JSON Schemas

| File | Schema |
| --- | --- |
| `.pinake/pinake.json` | `schemas/pinake.schema.json` |
| `.pinake/.state/modules.json` | `schemas/modules.schema.json` |
| `.pinake/.state/ui.json` | `schemas/ui.schema.json` |
| `.pinake/.state/indexes.json` | `schemas/indexes.schema.json` |
| `.pinake/.state/migrations.json` | `schemas/migrations.schema.json` |
| `.pinake/.state/version.json` | `schemas/version.schema.json` |

## Warning Philosophy

Warnings identify documentation quality, style, link, ADR naming, frontmatter, duplicate id/path, and secret hygiene concerns. They do not fail validation. Errors identify missing required entries, invalid JSON, schema mismatch, or manifest documents missing on disk.

## Link Validation

Local Markdown links are resolved inside `.pinake/docs`. External links, mail links, telephone links, and same-document anchors are ignored. Parent traversal candidates are rejected.

## Secret Hygiene

Secret checks are conservative and warning-only. They help catch obvious private keys, known token prefixes, AWS access key IDs, Slack tokens, JWT-like tokens, and credential assignments with concrete values. They do not replace repository secret scanning.
