---
title: "Roadmap"
type: roadmap
status: draft
order: 1
---
# Roadmap

## Current Shipped Slice

Repository evidence indicates the current unreleased slice includes native TreeView documentation management, setup templates, component module generation, search/indexing, validation, repair/upgrade, import/export, CI validation generation, keybindings, and packaged agent skill installation.

## Near-Term Candidates

| Outcome | Evidence | Status |
| --- | --- | --- |
| Stabilize v0.1 extension release. | `CHANGELOG.md`, `docs/release-checklist.md` | Needs owner confirmation |
| Continue interface polish. | `docs/interface-audit.md`, `docs/interface-accessibility-qa.md` | Needs owner confirmation |
| Expand deferred component modules. | `docs/component-catalog-roadmap.md`, `docs/scaffold-reference.md` | Needs owner confirmation |
| Add CI Pinake validation to repositories that commit Pinake docs. | CI generator and validator exist. | Needs owner confirmation |
| Improve package/release automation. | Release checklist exists, packaging automation not visible. | Needs owner confirmation |

## Deferred Backlog Themes

The scaffold reference and component roadmap list deferred module ideas such as Authorization, Payments, Search, Email, DataPipeline, ML, GraphDB, Logging, PluginExtension, Monorepo, LegacyMigration, Documentation, Testing, and DevTools.

## Decision Points

- Which module backlog slice should ship next?
- Which documentation template is the default for new workspaces after user feedback?
- Should the generated standalone validator be versioned independently?
- What release approval and marketplace publishing process should be formalized?
