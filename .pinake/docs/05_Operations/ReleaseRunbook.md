---
title: "Release Runbook"
type: runbook
status: draft
order: 1
---
# Release Runbook

## Scope

This runbook covers repository release preparation for the VS Code extension. It is based on `docs/release-checklist.md`, `CHANGELOG.md`, and `.github/workflows/ci.yml`.

## Automated Checks

Run these from the repository root:

| Check | Command |
| --- | --- |
| Compile | `npm run compile` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Prepublish | `npm run vscode:prepublish` |
| Pinake docs validation | `npm run pinake:validate -- --root . --format text` |

## Manual VS Code Smoke Test

1. Launch an Extension Development Host.
2. Create a fresh Pinake workspace.
3. Verify template and module selection.
4. Open preview and edit source for a generated document.
5. Create, rename, duplicate, delete, and drag a document or folder.
6. Add and remove a favorite.
7. Search documentation and inspect snippets.
8. Run validation and verify output plus Problems diagnostics.
9. Generate CI validation in a disposable workspace.
10. Import and export Markdown in a disposable workspace.

## Packaging Notes

`package.json` includes `out/**/*.js`, resources, scripts, schemas, docs, examples, README, and CHANGELOG. It excludes `out/test/**`.

## Release Owner

Release owner, marketplace publisher identity, approval flow, and signing requirements are not present in the repository. Status: Needs owner confirmation.
