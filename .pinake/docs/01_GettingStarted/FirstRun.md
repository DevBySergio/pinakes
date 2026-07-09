---
title: "First Run"
type: how-to
status: draft
order: 3
---
# First Run

## Objective

Use this flow to verify a local Extension Development Host can create, navigate, and validate a Pinake workspace.

## Steps

1. Compile the extension with `npm run compile`.
2. Launch an Extension Development Host from VS Code.
3. Open a disposable workspace folder in the host.
4. Run `Pinake: Create Documentation`.
5. Select a template and module set that fits the test case.
6. Choose whether to hide `.pinake` in Explorer.
7. Confirm the final summary.
8. Open the Pinake Activity Bar view and inspect the generated tree.
9. Open a document in preview, then use `Pinake: Edit` to edit source.
10. Run `Pinake: Validate` and inspect the Pinakes output channel.

## Expected Files

| File or folder | Expected content |
| --- | --- |
| `.pinake/pinake.json` | Manifest with project metadata, enabled modules, and document records. |
| `.pinake/docs/` | Markdown files for selected template and modules. |
| `.pinake/.gitignore` | Contains `.state/`. |
| `.pinake/.state/modules.json` | Enabled module state. |
| `.pinake/.state/ui.json` | Expanded, collapsed, favorites, and sort mode state. |
| `.pinake/.state/indexes.json` | Offline search and link graph index. |
| `.pinake/.state/migrations.json` | Initial or upgrade migration history. |
| `.pinake/.state/version.json` | Pinake and extension version markers. |

## Command Checks

| Command | Check |
| --- | --- |
| `Pinake: Search Documentation` | Rebuilds the index and returns matching Markdown documents. |
| `Pinake: New Markdown File` | Creates Markdown with frontmatter and adds it to the manifest. |
| `Pinake: Duplicate` | Copies a file or folder without overwriting existing content and updates manifest/index state. |
| `Pinake: Rename` | Renames within `.pinake/docs` and rewrites manifest, UI state, and index references. |
| `Pinake: Delete` | Moves the selected file or folder to trash when supported and removes manifest/state references. |
| `Pinake: Repair` | Recreates missing generated docs/state and discovers untracked Markdown without overwriting edited files. |

## Failure Handling

If a step fails, check the Pinakes output channel first. Most command failures append stack or message details there before showing the user-facing error. Then verify that the target URI is inside `.pinake/docs` and that the manifest is valid JSON.
