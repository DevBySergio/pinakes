---
title: "Testing"
type: testing
status: draft
order: 2
---
# Testing

## Strategy

Pinake tests should protect the storage contract and user workflows. The highest-risk regressions are data loss, manifest drift, broken validation, command ID churn, and accidental sensitive content in generated docs.

## Test Layers

| Layer | Purpose | Current command |
| --- | --- | --- |
| TypeScript compile | Catch type and emitted JS issues. | `npm run compile` |
| Lint | Enforce code quality rules for `src`. | `npm run lint` |
| Extension tests | Exercise services and command harnesses in VS Code test environment. | `npm test` |
| Standalone validation | Validate Pinake workspaces outside VS Code. | `npm run pinake:validate -- --root /path/to/workspace --format text` |
| Manual smoke | Verify native VS Code UI behavior. | Release checklist |

## Fixture Guidance

- Use temporary directories for generated Pinake workspaces.
- Avoid real secrets in fixtures; use safe placeholders.
- Include local Markdown links that cover extensionless paths, folders with `index.md`, query strings, anchors, external links, and broken links.
- Test non-overwrite behavior by editing generated docs before repair or module regeneration.
- Verify both manifest and filesystem side effects.

## CI Expectations

The repository CI runs on pull requests and pushes to `main`. It installs dependencies with `npm ci`, compiles, lints, and runs extension tests with `xvfb-run -a npm test`.

## Manual Release Smoke

Before release, verify the Extension Development Host can create docs, open preview, edit source, search, favorite, rename, delete, validate, repair, generate CI validation, import, export, and install the packaged agent skill if that area changed.
