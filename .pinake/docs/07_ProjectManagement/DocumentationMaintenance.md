---
title: "Documentation Maintenance"
type: process
status: draft
order: 3
---
# Documentation Maintenance

## Sources

| Source | Role |
| --- | --- |
| `README.md` | Public product summary and command list. |
| `docs/*.md` | Authored design, architecture, security, scaffold, interface, and release references. |
| `.pinake/docs/**` | Source-backed project handbook for Pinake navigation and validation. |
| `.pinake/pinake.json` | Pinake manifest and TreeView metadata source of truth. |
| `CHANGELOG.md` | Release history source of truth. |

## Update Triggers

Update Pinake docs when a change affects setup, commands, storage, schemas, validation, import/export, repair/upgrade, generated modules, security/privacy posture, CI, release, or user-facing workflows.

## Maintenance Workflow

1. Search existing docs before adding a new document.
2. Prefer a focused new document over a broad unrelated section.
3. Add frontmatter and a manifest record for every new Markdown file.
4. Keep local Markdown links inside `.pinake/docs`.
5. Use source paths in code formatting for references outside `.pinake/docs`.
6. Run Pinake validation and resolve errors before finishing.
7. Review warnings and document any owner-confirmation gaps.

## Ownership

| Area | Owner |
| --- | --- |
| Product narrative | Needs owner confirmation |
| Architecture docs | Needs owner confirmation |
| Security/privacy docs | Needs owner confirmation |
| Release docs | Needs owner confirmation |
| Pinake manifest hygiene | Repository maintainers |

## Review Cadence

Review the handbook before releases, after storage or validation changes, and when the component module catalog changes.
