---
title: "Threat Model"
type: architecture
status: draft
order: 6
---
# Threat Model

## Assets

| Asset | Risk | Existing control |
| --- | --- | --- |
| Authored Markdown docs | Accidental sensitive content committed to repository. | Secret hygiene warnings, review guidance, local-first storage. |
| Manifest | Invalid paths or metadata causing broken tree behavior. | JSON schema validation, safe path checks, manifest shape checks. |
| Generated state | Stale index, favorites, or UI state after moves/deletes. | State rewrite helpers, index rebuilds, repair. |
| Workspace settings | Unexpected Explorer hide setting. | Written only after explicit setup choice. |
| User Codex skill | Overwriting a custom skill. | Install command compares content and asks before replacement. |

## Threat Scenarios

| Scenario | Impact | Mitigations |
| --- | --- | --- |
| Importing Markdown that contains credentials. | Sensitive values may become repository docs. | Import only copies Markdown, validation warns on known patterns, user reviews before commit. |
| Moving files outside docs root. | Manifest paths could point outside intended storage. | Commands and drag/drop use containment checks and relative path rules. |
| Broken local links after rename or move. | Search graph and docs become unreliable. | Index rebuild/update, validation link checks, backlink and broken reference APIs. |
| Generated state committed accidentally. | No secret by design, but noisy and local. | `.pinake/.gitignore` ignores `.state/`. |
| CI validator divergence from extension validator. | CI and local checks may disagree. | Standalone script mirrors core runtime validation logic; update both when rules change. |

## Residual Risks

| Risk | Status |
| --- | --- |
| Secret hygiene is pattern-based and not exhaustive. | Use dedicated secret scanning in repository policy. |
| Ownership and escalation paths are not represented in code. | Needs owner confirmation. |
| Marketplace distribution and signing process are not documented in source beyond release checklist. | Needs owner confirmation. |
| Imported docs can include private business context even without token-shaped values. | Requires human review before commit. |

## Security Review Triggers

Run a focused security review when a change touches filesystem writes, import/export, validation patterns, generated CI, schema relaxations, path normalization, diagnostics, agent skill installation, or new external service calls.
