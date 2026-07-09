# Pinake Public Specification

This document defines the workspace-level Pinake storage contract used by Pinake Editor. It is written for extension maintainers, automation authors, and teams that want to inspect or generate Pinake documentation outside the VS Code UI.

## Goals

- Keep project documentation local to the workspace.
- Store human-authored content as Markdown under `.pinake/docs`.
- Store project metadata in a small JSON manifest at `.pinake/pinake.json`.
- Keep generated runtime state under `.pinake/.state` so it can be ignored or regenerated.
- Preserve compatibility for existing command IDs and generated workspaces.

## Directory Layout

```text
.pinake/
  .gitignore
  pinake.json
  docs/
    00_overview/
      index.md
  .state/
    modules.json
    ui.json
    indexes.json
    migrations.json
    version.json
  tools/
    validate-pinake.mjs
```

`docs/` is the authoritative documentation root. `.state/` is extension-owned generated state. `tools/` is optional and is created by `Pinake: Generate CI Validation Workflow`.

## Manifest

The manifest lives at `.pinake/pinake.json` and follows `schemas/pinake.schema.json`.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | number | yes | Manifest format version. Current generated manifests use `1`. |
| `storage.root` | string | yes | Documentation root. Current generated workspaces use `.pinake/docs`. |
| `storage.hiddenFromExplorer` | boolean | yes | Whether setup requested `**/.pinake` in `.vscode/settings.json`. |
| `project.name` | string | yes | Human-readable project name. |
| `project.documentationType` | string | yes | Broad documentation purpose, such as `internal`. |
| `project.audience` | string array | yes | Intended readers, such as developers or operators. |
| `project.template` | string | yes | Selected setup template id. |
| `modules` | object | yes | Map of module id to enabled/disabled state. |
| `documents` | array | yes | Manifest-backed document records under `storage.root`. |

Document records use this shape:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Stable document id used by the manifest. |
| `title` | string | yes | Display title in the TreeView. |
| `path` | string | yes | Path relative to `.pinake/docs`; must not be absolute or contain `..`. |
| `type` | enum | yes | One of `overview`, `tutorial`, `how-to`, `reference`, `explanation`, `architecture`, `adr`, `runbook`, `changelog`, `roadmap`, `glossary`, `troubleshooting`, `testing`, or `process`. |
| `status` | enum | yes | One of `draft`, `in-review`, `stable`, or `deprecated`. |
| `order` | number | yes | Sort metadata used by generated templates and future views. |

Manifest records intentionally do not contain Markdown body content. Document content belongs in `.pinake/docs`.

## Markdown Documents

Generated Markdown starts with frontmatter that mirrors manifest metadata:

```markdown
---
title: "Overview"
type: overview
status: draft
order: 1
---

# Overview
```

The manifest remains the source of truth for the TreeView, while frontmatter makes files useful in editors and external tooling.
Validation warns when manifest-backed Markdown frontmatter is missing or when `title`, `type`, `status`, or `order` drift from the manifest.

## State Files

All state files live under `.pinake/.state` and are validated by JSON schemas contributed through `package.json`.

| File | Schema | Purpose | Regeneration |
| --- | --- | --- | --- |
| `modules.json` | `schemas/modules.schema.json` | Installed generated component modules with version/config metadata. | Recreated by scaffold, repair, upgrade, and module generation. |
| `ui.json` | `schemas/ui.schema.json` | Expanded/collapsed paths, favorites, sort mode, and last-opened document. | Recreated with empty arrays when missing. |
| `indexes.json` | `schemas/indexes.schema.json` | Offline search index, headings, tags, terms, and link graph data. | Rebuilt by scaffold, repair, search, validation support, and document mutations. |
| `migrations.json` | `schemas/migrations.schema.json` | Upgrade history with version, timestamp, and notes. | Created on upgrade or initial state repair. |
| `version.json` | `schemas/version.schema.json` | Pinake and extension version markers. | Synced by upgrade and initial state creation. |

`.pinake/.gitignore` ignores `.state/` by default because these files are local runtime state.

## Path Rules

- Manifest document paths are relative to `.pinake/docs`.
- Extension commands reject absolute paths, `..`, and paths outside `.pinake/docs`.
- Tree rename, duplicate, and delete commands update manifest entries, search indexes, and UI state references together.
- Repair discovers untracked Markdown under `.pinake/docs` and adds it to the manifest without overwriting edited documents.

## Validation

`Pinake: Validate` and the standalone validator check:

- required `.pinake` files and folders;
- JSON schema conformance for manifest and state files;
- manifest document path safety and duplicates;
- missing Markdown files referenced by the manifest;
- ADR filename conventions;
- frontmatter presence and manifest alignment for `title`, `type`, `status`, and `order`;
- Markdown style warnings and local link targets;
- warning-only secret hygiene patterns;
- VS Code Problems diagnostics for actionable issues when run inside the extension.

Validation warnings do not necessarily fail the manifest. Errors make the validation result invalid.

## Compatibility

Public command titles use singular `Pinake:`. Existing command IDs such as `pinakes.validate` remain available for compatibility with keybindings, scripts, and older command references.
