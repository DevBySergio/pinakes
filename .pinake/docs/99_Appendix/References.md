---
title: "References"
type: reference
status: draft
order: 2
---
# References

## Pinake Handbook Links

| Resource | Purpose |
| --- | --- |
| [Overview](../00_Overview/Overview.md) | Product summary and reading path. |
| [Product Context](../00_Overview/ProductContext.md) | Goals, non-goals, stakeholders, and constraints. |
| [Installation](../01_GettingStarted/Installation.md) | Local setup and smoke check. |
| [Context](../02_Architecture/Context.md) | System boundary and trust boundaries. |
| [Storage And State](../02_Architecture/StorageAndState.md) | Manifest, docs, state, and mutation rules. |
| [Validation Strategy](../04_Quality/ValidationStrategy.md) | Runtime and CLI validation model. |
| [Release Runbook](../05_Operations/ReleaseRunbook.md) | Release checks and manual smoke test. |
| [Command Catalog](CommandCatalog.md) | Command titles, ids, and keybindings. |

## Repository Source References

Use these source paths when validating or updating handbook content:

| Path | Purpose |
| --- | --- |
| `README.md` | Public extension overview and command list. |
| `package.json` | VS Code contributions, activation events, scripts, package files, keybindings, CLI bin. |
| `CHANGELOG.md` | Current unreleased changes. |
| `docs/public-specification.md` | Pinake storage contract. |
| `docs/extension-architecture-and-flows.md` | Architecture, command table, keybindings, UI flow. |
| `docs/scaffold-reference.md` | Templates, modules, presets, repair, upgrade. |
| `docs/security-privacy.md` | Local-first and secret hygiene policy. |
| `docs/release-checklist.md` | Release checks. |
| `src/extension.ts` | Activation and dependency wiring. |
| `src/commands/PinakesCommands.ts` | Command flows and prompts. |
| `src/services/*` | Storage, state, index, validation, transfer, and skill installation services. |
| `src/templates/pinakeTemplates.ts` | Core setup templates. |
| `src/modules/moduleDescriptors.ts` | Generated component modules and presets. |
| `src/test/extension.test.ts` | Behavioral coverage. |
| `scripts/validate-pinake.mjs` | Standalone validator. |
| `schemas/*.schema.json` | Manifest and state JSON schemas. |

## External References

External owner, support, marketplace, and release-channel links are not present in the repository. Status: Needs owner confirmation.
