---
title: "Storage And State"
type: architecture
status: draft
order: 3
---
# Storage And State

## Required Layout

Pinake workspaces use this layout:

| Path | Purpose | Generated or authored |
| --- | --- | --- |
| `.pinake/pinake.json` | Manifest and source of truth for project metadata, enabled modules, and document records. | Generated then maintained |
| `.pinake/docs/` | Human-authored Markdown documentation root. | Authored and generated starter content |
| `.pinake/.gitignore` | Ignores `.state/`. | Generated |
| `.pinake/.state/modules.json` | Enabled generated modules and version/config metadata. | Generated state |
| `.pinake/.state/ui.json` | Expanded/collapsed folders, favorites, sort mode, last opened, and optional scroll. | Generated state |
| `.pinake/.state/indexes.json` | Offline search index, headings, tags, keywords, links, and term map. | Generated state |
| `.pinake/.state/migrations.json` | Current Pinake version and migration history. | Generated state |
| `.pinake/.state/version.json` | Pinake spec and extension version markers. | Generated state |
| `.pinake/tools/validate-pinake.mjs` | Optional standalone validator generated for target workspaces. | Optional generated tooling |

## Manifest Contract

`.pinake/pinake.json` must contain `version`, `storage`, `project`, `modules`, and `documents`. Document paths are relative to `.pinake/docs`, must not be absolute, and must not contain parent traversal.

Document records require `id`, `title`, `path`, `type`, `status`, and `order`. The manifest intentionally does not store Markdown body content.

## Markdown Frontmatter

Each manifest-backed Markdown file should begin with frontmatter that mirrors the manifest:

| Field | Source of truth | Validator behavior |
| --- | --- | --- |
| `title` | Manifest document title | Warning on drift. |
| `type` | Manifest document type | Warning on drift. |
| `status` | Manifest document status | Warning on drift. |
| `order` | Manifest document order | Warning on drift. |

## Generated State Policy

`.pinake/.state` is extension-owned. It can be recreated by scaffold, repair, upgrade, module generation, indexing, and validation-related flows. The recommended commit policy is to commit `.pinake/.gitignore` and not commit `.pinake/.state/**`.

## Mutation Rules

| Operation | Required synchronization |
| --- | --- |
| Create Markdown file | Write file, add manifest document, update index. |
| Duplicate file | Copy file, add manifest document, update or rebuild index. |
| Duplicate directory | Copy directory, add documents for copied Markdown, rebuild index. |
| Rename file | Rename file, rewrite manifest path/title, rewrite UI references, update index. |
| Rename directory | Rename directory, rewrite manifest child paths, rewrite UI references, rebuild index. |
| Delete file | Trash file where supported, remove manifest document, remove UI references, remove index document. |
| Delete directory | Trash directory where supported, remove child manifest docs, remove UI references, rebuild index. |
| Drag-and-drop move | Move selected top-level Pinake items, update manifest, state, index, and diagnostics. |

## Related Docs

- [Validation Strategy](../04_Quality/ValidationStrategy.md)
- [Troubleshooting](../05_Operations/Troubleshooting.md)
