---
title: "Context"
type: architecture
status: draft
order: 1
---
# Context

## System Boundary

Pinake Editor runs inside VS Code and manages documentation for the currently selected workspace folder. The extension owns the Pinake Activity Bar container, TreeView, command orchestration, templates, manifests, generated state, validation, and import/export flows.

## Actors And Systems

| Actor or system | Relationship | Contract | Owner |
| --- | --- | --- | --- |
| VS Code user | Invokes commands and navigates the tree. | Native VS Code UI: TreeView, QuickPick, InputBox, Markdown Preview, diagnostics. | Needs owner confirmation |
| Workspace filesystem | Stores documentation, manifest, generated state, and optional CI files. | VS Code `workspace.fs` reads and writes. | Repository owner |
| VS Code extension host | Runs compiled extension code from `out/extension.js`. | Activation events and contributed commands from `package.json`. | Extension maintainer |
| GitHub Actions | Runs repository CI and optional generated Pinake validation. | `.github/workflows/ci.yml`; optional `.github/workflows/pinake-validate.yml`. | Repository maintainer |
| Codex agent | Can use installed Pinake skill to generate and maintain docs. | Packaged skill copied from `resources/skills/pinake/SKILL.md`. | User or workspace owner |

## External Dependencies

Pinake Editor has no normal-operation service dependency. Dev dependencies are build and test tools declared in `package.json`: TypeScript, ESLint, VS Code test tooling, and type packages.

## Trust Boundaries

| Boundary | Inputs | Controls |
| --- | --- | --- |
| User prompts to filesystem writes | Template selections, names, paths, selected import/export folders. | Confirmation dialogs, path normalization, existence checks, overwrite avoidance. |
| Manifest to TreeView | `.pinake/pinake.json` document records. | Manifest shape validation, safe relative path rules, filesystem existence checks. |
| Markdown links to search graph | Links found in `.pinake/docs/**/*.md`. | Link target normalization, no absolute or parent traversal candidates. |
| Generated docs to source control | Markdown content and optional CI files. | Validation, secret hygiene warnings, review before commit. |

## Data Classification

| Data | Classification | Notes |
| --- | --- | --- |
| Pinake Markdown docs | Repository content | May be committed after review. |
| Pinake manifest | Repository metadata | Commit after review. |
| Generated `.pinake/.state` files | Local generated state | Ignored by default. |
| Imported Markdown | Repository content after import | Must be reviewed for sensitive data. |
| Secrets, customer data, raw incident evidence | Not allowed in Pinake docs | Document references only, not values. |

## Related Docs

- [Storage And State](StorageAndState.md)
- [Command Flows](CommandFlows.md)
- [Security Overview](Security/Overview.md)
- [Threat Model](Security/ThreatModel.md)
