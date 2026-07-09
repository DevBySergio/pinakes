---
title: "Troubleshooting"
type: troubleshooting
status: draft
order: 3
---
# Troubleshooting

## Diagnostic Sources

| Source | Use |
| --- | --- |
| Pinakes output channel | Command failures, scaffold summaries, validation reports, properties output. |
| VS Code Problems panel | File-scoped Pinake validation diagnostics. |
| `.pinake/pinake.json` | Manifest metadata, module flags, document ids and paths. |
| `.pinake/.state/indexes.json` | Search index and link graph state. |
| `.pinake/.state/ui.json` | Favorites, sort mode, expanded/collapsed state, last opened document. |
| Git diff | Review generated docs, manifest, settings, CI, and tool changes. |

## Common Issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Tree shows empty state even though docs exist. | Missing or invalid manifest, wrong workspace root, or docs outside `.pinake/docs`. | Open correct root, run `Pinake: Repair`, validate manifest. |
| Validation reports missing state files. | Manual Pinake setup did not generate `.pinake/.state`. | Run `Pinake: Repair` in VS Code or recreate state with scaffold tooling. |
| Frontmatter warnings after manual edits. | Markdown metadata drifted from manifest. | Align `title`, `type`, `status`, and `order` with `.pinake/pinake.json`. |
| Broken Markdown link warnings. | Link target does not resolve inside `.pinake/docs`. | Fix relative link or remove it if it points outside Pinake docs. |
| Rename or move does not update expected files. | Item is a virtual favorite or outside docs root. | Operate on the original document/folder under `.pinake/docs`. |
| Search misses recent edits. | Index is stale. | Run search, repair, or an operation that rebuilds or updates the index. |
| CI test fails on Linux display. | VS Code tests need a display. | Use `xvfb-run -a npm test`. |

## Recovery Path

1. Stop editing affected files.
2. Inspect Git diff to identify generated versus authored changes.
3. Run Pinake validation and fix errors first.
4. Run `Pinake: Repair` if generated files are missing.
5. Rebuild the index through search or repair if search/link graph data is stale.
6. Re-run compile, lint, tests, and Pinake validation when source or docs changed.
