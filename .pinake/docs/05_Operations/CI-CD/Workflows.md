---
title: "CI/CD Workflows"
type: runbook
status: draft
order: 2
---
# CI/CD Workflows

## Repository CI

The checked-in workflow is `.github/workflows/ci.yml`.

| Field | Value |
| --- | --- |
| Workflow name | CI |
| Triggers | Pull requests and pushes to `main` |
| Permissions | `contents: read` |
| Runner | `ubuntu-latest` |
| Node version | 22 |
| Dependency install | `npm ci` |
| Build step | `npm run compile` |
| Lint step | `npm run lint` |
| Test step | `xvfb-run -a npm test` |

## Optional Generated Pinake Validation

`Pinake: Generate CI Validation Workflow` writes:

| File | Purpose |
| --- | --- |
| `.pinake/tools/validate-pinake.mjs` | Standalone validator copied into the target workspace. |
| `.github/workflows/pinake-validate.yml` | GitHub Actions workflow that runs the validator with `--format github`. |

The generator writes files only if they are missing. Existing files are skipped.

## Required Checks

At minimum, every PR should pass compile, lint, and extension tests. Add Pinake validation as a required check when a repository commits `.pinake/docs` and wants documentation validation in CI.

## Failure Response

| Failure | First response |
| --- | --- |
| `npm ci` | Check lockfile drift and Node version. |
| Compile | Check TypeScript errors and generated `out` expectations. |
| Lint | Fix source lint issues or update rules intentionally. |
| Extension tests | Reproduce locally; inspect VS Code test output and failing fixture. |
| Pinake validation | Inspect reported path, fix errors first, then review warnings. |
