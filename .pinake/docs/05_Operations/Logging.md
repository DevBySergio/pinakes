---
title: "Logging"
type: runbook
status: draft
order: 5
---
# Logging

## Runtime Logs

| Source | Location | Purpose |
| --- | --- | --- |
| Pinakes output channel | VS Code Output panel | Command failures, scaffold summaries, validation reports, properties output. |
| VS Code Problems | Problems panel | File-scoped validation diagnostics. |
| Extension test output | Terminal running `npm test` | Test failures and VS Code test diagnostics. |
| GitHub Actions logs | CI workflow run | Compile, lint, and test failures in CI. |

## What Commands Log

High-risk commands append detailed errors to the output channel when they catch exceptions. Validation writes a formatted report and then shows the output channel. Show Properties clears and writes item metadata to the output channel.

## Sensitive Data Guidance

Do not paste raw logs containing credentials, tokens, private paths, customer data, or incident evidence into Pinake docs. Redact before adding examples. Validation warns on several secret-like patterns, but manual review is required.

## Debugging Tips

| Investigation | First check |
| --- | --- |
| Command failed | Pinakes output channel. |
| Validation issue | Problems panel and output channel. |
| Tree stale | File watcher, workspace root, manifest, and `.pinake/docs` existence. |
| Search result wrong | `.pinake/.state/indexes.json` and IndexService tests. |
| CI-only failure | GitHub Actions logs and Node version. |
