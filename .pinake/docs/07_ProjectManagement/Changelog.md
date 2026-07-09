---
title: "Changelog"
type: changelog
status: draft
order: 2
---
# Changelog

## Unreleased Repository Highlights

The root `CHANGELOG.md` records the current unreleased extension changes. This Pinake summary groups them by area for maintainers.

### Added

- Native Pinake Activity Bar view and documentation TreeView.
- Workspace initialization with `.pinake/pinake.json`, `.pinake/docs/`, and generated state files.
- Setup wizard for templates, optional modules, Explorer hiding, legacy migration, and final confirmation.
- Minimal Internal Docs and Full Product Handbook templates.
- Expanded component module catalog and module presets.
- Markdown preview/edit flow, explicit file actions, drag-and-drop move/reorder, favorites, and persisted tree state.
- Offline documentation search with snippets, filters, backlinks, broken references, and graph data.
- Repair, upgrade, import, export, validation, CI validation generation, and packaged agent skill installation.
- JSON schemas, diagnostics, keybindings, tests, and design/reference docs.

### Quality And Security

- Runtime and standalone validation cover schemas, required files, manifest documents, ADR names, frontmatter, Markdown style, local links, and secret hygiene warnings.
- Security/privacy docs emphasize local-first behavior and no telemetry or network APIs for normal extension behavior.

## Changelog Maintenance

Keep the root `CHANGELOG.md` as the release source of truth. Update this Pinake changelog when documentation structure, release process, or user-facing Pinake behavior changes materially.
