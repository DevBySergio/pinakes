---
title: "Configuration"
type: reference
status: draft
order: 2
---
# Configuration

## Configuration Sources

| Source | Purpose | Notes |
| --- | --- | --- |
| `package.json` | Extension manifest, command contributions, keybindings, activation events, scripts, package files. | Primary VS Code contribution source. |
| `tsconfig.json` | TypeScript compiler configuration. | Used by `npm run compile` and `npm run watch`. |
| `eslint.config.mjs` | Lint rules for `src`. | Used by `npm run lint`. |
| `schemas/*.schema.json` | JSON validation contract for Pinake manifest and state files. | Used by runtime validation and contributed schema validation. |
| `.github/workflows/ci.yml` | Repository CI workflow. | Runs compile, lint, and extension tests on Node 22. |

## VS Code Contributions

| Contribution | Value |
| --- | --- |
| Activity Bar container | `pinakesExplorer` titled `Pinake` with icon `resources/pinake-icon.svg` |
| Tree view | `pinakesView` named `Project Documentation` |
| Main entry | `./out/extension.js` |
| Activation | View activation and Pinake command activation events |
| CLI binary | `pinake-validate` mapped to `./scripts/validate-pinake.mjs` |

## Runtime Configuration

The extension does not require environment variables for normal operation. It reads and writes predictable workspace files through VS Code APIs:

| Path | When written | Commit guidance |
| --- | --- | --- |
| `.pinake/pinake.json` | Create, repair, upgrade, module generation, import, rename, duplicate, delete, drag-and-drop. | Commit after review. |
| `.pinake/docs/**` | Create, edit, import, repair, module generation. | Commit authored docs after review. |
| `.pinake/.state/**` | State creation, indexing, UI state, migrations, version sync. | Do not commit by default. |
| `.pinake/.gitignore` | Create or repair. | Commit. |
| `.vscode/settings.json` | Only when the user chooses to hide `.pinake` in Explorer. | Team decision. |
| `.pinake/tools/validate-pinake.mjs` and `.github/workflows/pinake-validate.yml` | Only from `Pinake: Generate CI Validation Workflow`. | Commit only when CI validation is desired. |

## Agent Skill Configuration

`Pinake: Install Agent Skill` copies the packaged skill from `resources/skills/pinake/SKILL.md` to the user Codex skill directory. If `CODEX_HOME` points inside the user's home directory, it is used; otherwise the target defaults to `~/.codex/skills/pinake/SKILL.md`.

## Secrets

No real secrets are required by this repository. Documentation examples must use placeholders such as `EXAMPLE_API_TOKEN`, `REDACTED`, or `${CLIENT_SECRET}`. Do not commit environment files with real credentials, customer data, or raw incident evidence.

## Validation Commands

| Command | Purpose |
| --- | --- |
| `node scripts/validate-pinake.mjs --root /path/to/workspace --format text` | Validate a target Pinake workspace from this repository. |
| `npm run pinake:validate -- --root /path/to/workspace --format json` | Same validator through npm script. |
| `Pinake: Validate` | Runtime validation plus VS Code diagnostics inside the extension. |
