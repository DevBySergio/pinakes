---
title: "Validator CLI"
type: reference
status: draft
order: 5
---
# Validator CLI

## Purpose

The validator CLI lets maintainers and CI validate a Pinake workspace without running the VS Code extension UI. The package exposes `pinake-validate` through `package.json`, and the implementation lives at `scripts/validate-pinake.mjs`.

## Usage

| Command | Purpose |
| --- | --- |
| `node scripts/validate-pinake.mjs --root /path/to/workspace --format text` | Human-readable report. |
| `node scripts/validate-pinake.mjs --root /path/to/workspace --format json` | Machine-readable report. |
| `node scripts/validate-pinake.mjs --root /path/to/workspace --format github` | GitHub Actions annotations. |
| `npm run pinake:validate -- --root /path/to/workspace --format text` | Same validator through npm. |

## Validation Categories

| Category | Result type |
| --- | --- |
| Missing required `.pinake` entries | Error |
| Invalid JSON or schema mismatch in manifest/state | Error |
| Manifest document path missing on disk | Error |
| Duplicate manifest ids or paths | Warning |
| ADR filename convention drift | Warning |
| Frontmatter missing or mismatched with manifest | Warning |
| Broken local Markdown links | Warning |
| Markdown style issues | Warning |
| Secret-like content | Warning |

## Exit Code

The CLI exits with code 0 when validation has no errors. Warnings are reported but do not make the result invalid.

## Alignment Requirement

When changing validation behavior, update both `src/services/ValidationService.ts` and `scripts/validate-pinake.mjs`. Tests should cover runtime behavior, standalone behavior where practical, and output formatting when user-facing reports change.
