---
title: "Overview"
type: overview
status: draft
order: 1
---
# Overview

## Purpose

Pinake Editor is a VS Code extension for managing internal project documentation from a native sidebar. It creates and maintains a local Pinake workspace under `.pinake/`, stores authored Markdown in `.pinake/docs`, and records document metadata in `.pinake/pinake.json`.

The extension is aimed at teams and agents that need project documentation to be source-backed, reviewable, searchable, and usable without a hosted documentation service.

## Product Snapshot

| Field | Value |
| --- | --- |
| Product | Pinake Editor |
| Package name | `pinakes` |
| Display name | Pinake Editor |
| Current package version | `0.0.1` |
| VS Code engine | `^1.125.0` |
| Runtime | VS Code extension host, compiled from TypeScript |
| Primary storage | Workspace-local `.pinake/` directory |
| Network behavior | No telemetry or network APIs for normal extension behavior |
| Source evidence | `README.md`, `package.json`, `src/extension.ts`, `docs/public-specification.md` |

## Primary Users

| User | Goal | Main entry point |
| --- | --- | --- |
| Developer | Create, edit, search, validate, and maintain project docs inside VS Code. | Pinake Activity Bar and Command Palette |
| Maintainer | Keep documentation structure, manifests, validation, and templates consistent. | Source files under `src/`, `schemas/`, and `docs/` |
| Automation author | Generate, inspect, or validate Pinake docs outside the VS Code UI. | `scripts/validate-pinake.mjs` and the Pinake storage contract |
| AI agent | Create or repair source-backed docs from repository evidence. | Packaged skill at `resources/skills/pinake/SKILL.md` |

## Core Capabilities

- Create a Pinake workspace with selected setup template and modules.
- Open Markdown documents in preview by default and edit source explicitly.
- Manage files and folders with TreeView actions, context menus, keybindings, and drag-and-drop.
- Store favorites, expanded folders, sort mode, and last-opened document in generated UI state.
- Search local documentation through an offline index with headings, tags, snippets, backlinks, broken references, and graph data.
- Repair missing generated files, upgrade legacy `Pinake/` folders, and import or export Markdown documentation bundles.
- Validate manifests, state files, Markdown links, ADR names, frontmatter, style, and secret hygiene.
- Generate optional CI validation tooling and install the packaged Pinake agent skill.

## Source Of Truth

This handbook summarizes repository evidence. Existing authored design references remain in `docs/`; do not delete or overwrite them when updating Pinake docs.

| Area | Source paths |
| --- | --- |
| Public storage contract | `docs/public-specification.md`, `schemas/*.schema.json` |
| Extension architecture and commands | `docs/extension-architecture-and-flows.md`, `src/extension.ts`, `src/commands/PinakesCommands.ts` |
| Setup templates and modules | `docs/scaffold-reference.md`, `src/templates/pinakeTemplates.ts`, `src/modules/moduleDescriptors.ts` |
| Security and privacy | `docs/security-privacy.md`, `src/services/ValidationService.ts` |
| Release process | `docs/release-checklist.md`, `CHANGELOG.md`, `.github/workflows/ci.yml` |

## Current Status

- Lifecycle stage: active early extension development, based on package version `0.0.1` and the unreleased changelog.
- Product owner: Needs owner confirmation.
- Engineering owner: Needs owner confirmation.
- Support owner: Needs owner confirmation.
- Last Pinake handbook generation: 2026-07-09.

## Reading Path

Start with [Installation](../01_GettingStarted/Installation.md), then read [Context](../02_Architecture/Context.md), [Storage And State](../02_Architecture/StorageAndState.md), [Workflow](../03_Development/Workflow.md), and [Validation Strategy](../04_Quality/ValidationStrategy.md).
