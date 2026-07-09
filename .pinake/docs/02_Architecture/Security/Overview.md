---
title: "Security Overview"
type: architecture
status: draft
order: 5
---
# Security Overview

## Security Position

Pinake Editor is local-first. It stores documentation, manifests, indexes, and UI state in the current workspace. Normal extension behavior does not use telemetry APIs or network APIs.

## Filesystem Scope

| Location | Access pattern | Notes |
| --- | --- | --- |
| `.pinake/` | Create, repair, upgrade, import, export source, index, validate, tree operations. | Primary product storage. |
| `.vscode/settings.json` | Optional write only when the user confirms Explorer hiding. | Preserves existing settings where possible. |
| `.github/workflows/` | Optional write when generating CI validation. | User must choose command. |
| User Codex home | Optional write when installing the packaged skill. | Uses overwrite confirmation. |

## Sensitive Data Rules

Do not store credentials, tokens, private keys, production customer data, raw incident evidence, payment data, or complete real environment files in Pinake documents. Documentation should describe where secrets are managed and how they are rotated without including values.

## Validation Coverage

Pinake validation includes warning-only checks for private key material, common token formats, AWS access key IDs, Slack tokens, JWT-like tokens, and credential assignments with concrete values. It ignores safe placeholders such as `EXAMPLE_API_TOKEN`, `REDACTED`, and `${CLIENT_SECRET}`.

## Review Checklist

| Area | Questions |
| --- | --- |
| Local writes | Does the command write only to the expected workspace or user-approved target? |
| Path handling | Are absolute paths, parent traversal, and moves outside `.pinake/docs` rejected where relevant? |
| Overwrites | Are existing authored docs preserved unless the user explicitly confirms replacement? |
| Secrets | Could generated docs, imports, logs, or examples expose sensitive values? |
| Diagnostics | Are issues scoped to Pinake files and cleared when validation passes? |

## Source References

- `docs/security-privacy.md`
- `src/services/ValidationService.ts`
- `src/services/PinakeTransferService.ts`
- `src/tree/PinakeTreeDragAndDropController.ts`
