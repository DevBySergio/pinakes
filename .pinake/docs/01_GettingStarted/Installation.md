---
title: "Installation"
type: tutorial
status: draft
order: 1
---
# Installation

## Prerequisites

| Requirement | Version or access | How to verify |
| --- | --- | --- |
| Node.js | Compatible with the checked-in lockfile and CI Node 22 setup. | `node --version` |
| npm | Lockfile-backed install. | `npm --version` |
| VS Code | Engine compatibility is `^1.125.0`. | Check VS Code About dialog or `code --version` |
| Git | Required for normal repository development. | `git --version` |

## Install Dependencies

Run dependencies from the repository root:

| Step | Command | Expected result |
| --- | --- | --- |
| Install exact dependency tree | `npm ci` | Uses `package-lock.json` and installs dev dependencies. |
| Compile TypeScript | `npm run compile` | Emits extension JavaScript under `out/`. |
| Lint sources | `npm run lint` | ESLint reports no source issues. |
| Run extension tests | `npm test` | VS Code extension test suite passes. |

## Run In VS Code

The repository follows the standard VS Code extension development shape:

1. Open the repository in VS Code.
2. Install dependencies with `npm ci` if needed.
3. Run `npm run compile` or keep `npm run watch` running.
4. Start an Extension Development Host using the repository launch configuration if present, or VS Code's extension debugging flow.
5. Open a workspace folder in the Extension Development Host.
6. Use the Activity Bar item titled `Pinake` or run `Pinake: Create Documentation`.

## First Smoke Check

| Check | Expected behavior |
| --- | --- |
| Activity Bar | A Pinake container appears with `Project Documentation`. |
| Empty workspace | Tree shows a create-documentation empty state. |
| Create command | Wizard asks for template, modules, Explorer visibility, legacy migration if needed, and final confirmation. |
| Generated files | `.pinake/pinake.json`, `.pinake/docs/`, `.pinake/.gitignore`, and generated state are present. |
| Validation | `Pinake: Validate` reports no errors for a fresh generated workspace. |

## Common Setup Problems

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `npm test` cannot launch VS Code tests. | Missing platform dependencies or headless display support. | Use CI pattern `xvfb-run -a npm test` on Linux. |
| Commands are missing in the Extension Development Host. | Extension was not compiled or host is stale. | Run `npm run compile` and reload the host. |
| Pinake tree does not show workspace docs. | No workspace folder selected or wrong root chosen in a multi-root window. | Open or select the intended workspace folder. |
| Validation reports missing state files. | Manual docs were created without generated state. | Run `Pinake: Repair` in VS Code or recreate minimal `.pinake/.state` files. |
