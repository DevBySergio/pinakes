---
title: "Repository Map"
type: reference
status: draft
order: 4
---
# Repository Map

## Root Files

| Path | Purpose |
| --- | --- |
| `README.md` | Public product overview, features, commands, keybindings, storage, and design references. |
| `CHANGELOG.md` | Unreleased extension changes. |
| `package.json` | Extension manifest, scripts, VS Code contributions, keybindings, CLI bin, package files. |
| `package-lock.json` | npm dependency lockfile. |
| `tsconfig.json` | TypeScript compilation settings. |
| `eslint.config.mjs` | ESLint configuration. |
| `vsc-extension-quickstart.md` | Standard extension quickstart reference. |

## Source Areas

| Path | Responsibility |
| --- | --- |
| `src/extension.ts` | Activation, service wiring, TreeView, watcher, restore state. |
| `src/commands/` | Command registration and command orchestration. |
| `src/services/` | File, manifest, state, scaffold, index, validation, diagnostics, transfer, workspace, URI, feedback, and skill services. |
| `src/tree/` | Tree node definitions, provider, and drag-and-drop controller. |
| `src/templates/` | Core Pinake setup templates. |
| `src/modules/` | Generated component module descriptors and presets. |
| `src/test/` | VS Code extension tests. |

## Documentation And Schemas

| Path | Responsibility |
| --- | --- |
| `docs/` | Authored project references and design docs. |
| `schemas/` | JSON schemas for Pinake manifest and state files. |
| `resources/skills/pinake/` | Packaged Codex skill, references, and helper scripts. |
| `examples/sample-pinake-workspace/` | Sample workspace for Pinake behavior. |
| `scripts/validate-pinake.mjs` | Standalone validator and npm bin target. |
| `.github/workflows/ci.yml` | Repository CI workflow. |
