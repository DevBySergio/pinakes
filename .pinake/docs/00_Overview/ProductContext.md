---
title: "Product Context"
type: explanation
status: draft
order: 2
---
# Product Context

## Problem

Project documentation often drifts because it lives outside the repository, lacks a clear local structure, or is hard for tools and agents to validate. Pinake Editor addresses that problem by making documentation a first-class workspace artifact that is visible in VS Code, stored as Markdown, and validated with the same repository workflow as source code.

## Goals

| Goal | Evidence |
| --- | --- |
| Keep documentation local to the workspace. | `docs/public-specification.md`, `docs/security-privacy.md` |
| Make generated docs easy to inspect and commit. | `.pinake/docs` Markdown and `.pinake/pinake.json` manifest design |
| Keep UI native to VS Code. | TreeView, QuickPick, InputBox, Markdown Preview, output channel, diagnostics |
| Support automation and agents. | Standalone validator, packaged Pinake skill, manifest and schema files |
| Preserve user-authored content. | Scaffold, repair, import, and module generation skip existing files |

## Non-Goals

- Pinake Editor is not a hosted documentation portal.
- It does not use telemetry or normal-operation network APIs.
- It does not store documentation inside `.vscode`.
- It does not replace a dedicated secret-scanning platform.
- It does not make product ownership, deployment targets, or support rotations discoverable when they are not present in the repository.

## Stakeholders

| Stakeholder | Needs | Current evidence |
| --- | --- | --- |
| Extension users | Reliable commands and predictable storage. | README features and command contributions |
| Repository maintainers | Testable templates, schemas, and services. | `src/test/extension.test.ts` and CI |
| Security reviewers | Local-first behavior and secret hygiene. | `docs/security-privacy.md`, validator patterns |
| Documentation authors | Clear document structure and preview/edit flows. | TreeView provider and command implementations |
| Automation authors | Stable JSON schemas and CLI validation. | `schemas/`, `scripts/validate-pinake.mjs` |

## Constraints

- VS Code extension APIs are the runtime boundary for workspace filesystem operations.
- `.pinake/.state` is generated state and should be ignored by Git by default.
- Markdown document frontmatter should match the manifest for `title`, `type`, `status`, and `order`.
- Generated examples must use safe placeholders and never include real credentials or production customer data.

## Open Questions

| Question | Status |
| --- | --- |
| Who owns product direction and release approval? | Needs owner confirmation |
| What marketplace release cadence should be used after version `0.0.1`? | Needs owner confirmation |
| Which teams or repositories are first target users? | Needs owner confirmation |
| Should `.vscode/settings.json` Explorer hiding be committed in this repository? | Needs owner confirmation |
