---
title: "Testing"
type: testing
status: draft
order: 3
---
# Testing

## Automated Test Suite

The primary test suite is `src/test/extension.test.ts` and runs through `vscode-test`. It exercises services and command harness behavior inside the VS Code extension test environment.

## Commands

| Scope | Command | Notes |
| --- | --- | --- |
| Compile | `npm run compile` | TypeScript project build. |
| Lint | `npm run lint` | ESLint against `src`. |
| Test | `npm test` | VS Code extension tests. |
| CI test on Linux | `xvfb-run -a npm test` | Used by GitHub Actions. |
| Pinake validation | `node scripts/validate-pinake.mjs --root /path/to/workspace --format text` | Validates a target Pinake workspace. |

## Coverage Map

| Behavior | Current evidence |
| --- | --- |
| Minimal scaffold and state creation | Tests verify manifest, docs, state, and `.gitignore`. |
| Full Product Handbook template | Tests verify legacy-style folder paths and representative docs. |
| Setup reruns | Tests verify manifest and module state sync without unnecessary rewrites. |
| Explorer hiding | Tests preserve existing settings and add `**/.pinake`. |
| Legacy migration and upgrade | Tests copy old `Pinake/`, preserve legacy folder, create current state, and record migration. |
| Generated modules | Tests verify dependencies, non-overwrite behavior, and expanded catalog. |
| UI state | Tests cover expanded/collapsed, last-opened, sort mode, and favorites. |
| Indexing | Tests cover snippets, filters, backlinks, graph data, broken references, incremental updates, and removals. |
| Repair | Tests recreate missing generated files and add untracked Markdown to manifest. |
| Validation | Tests cover ADR names, links, frontmatter drift, schema errors, style warnings, and secret hygiene. |
| Diagnostics | Tests map Pinake issues to VS Code Problems and clear stale diagnostics. |
| Feedback formatting | Tests cover search, validation, properties, quick pick labels, names, and generated module pick items. |

## Manual Checks

Before release, run the manual VS Code smoke test from `docs/release-checklist.md`. Include create, preview, edit, search, validate, repair, import/export, and generated CI workflow checks when those areas changed.

## Known Gaps

| Gap | Impact | Status |
| --- | --- | --- |
| Marketplace packaging verification is documented but not automated in visible CI. | Release regressions could be missed before packaging. | Needs owner confirmation. |
| Visual TreeView behavior still benefits from manual VS Code checks. | UI regressions may not be fully covered by service tests. | Manual release checklist covers this. |
| Ownership-specific escalation paths are absent. | Review routing can be inconsistent. | Needs owner confirmation. |
