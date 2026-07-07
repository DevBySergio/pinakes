# Pinake Editor

Pinake Editor is a VS Code extension for managing project documentation stored in a local `Pinake/` folder.

## Features

- Adds a native Activity Bar container and `Project Documentation` tree view.
- Initializes a Pinake workspace with all Pinake-owned files inside `Pinake/`.
- Generates the canonical v0.1 documentation scaffold:
  - `00_Overview`
  - `01_GettingStarted`
  - `02_Architecture`
  - `03_Development`
  - `04_Quality`
  - `05_Operations`
  - `06_Decisions`
  - `07_ProjectManagement`
  - `99_Appendix`
- Generates v0.1 documentation modules for API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, and Authentication.
- Opens Markdown files with VS Code's built-in editor.
- Supports basic tree actions: new file, new folder, rename, delete, refresh, open, and open to side.
- Saves expanded, collapsed, and last-opened tree state in `Pinake/.pinake/ui.json`, and restores expanded folders when the view opens.
- Searches local documentation through the offline index in `Pinake/.pinake/indexes.json`.
- Repairs missing generated core and module files without overwriting edited documents.
- Validates Pinake structure, manifest fields, enabled modules, ADR names, and basic local Markdown links.
- Keeps all data local to the workspace. The extension does not use telemetry or network APIs.

## Commands

- `Pinakes: Create Pinake`
- `Pinakes: Generate Module`
- `Pinakes: Search Documentation`
- `Pinakes: Repair`
- `Pinakes: Validate`
- `Pinakes: Refresh`
- `Pinakes: New Markdown File`
- `Pinakes: New Folder`
- `Pinakes: Rename`
- `Pinakes: Delete`
- `Pinakes: Open File`
- `Pinakes: Open File to Side`

## Keybindings

- `F2`: Rename the selected Pinake tree item.
- `Delete`: Delete the selected Pinake tree item.
- `Cmd+Alt+F` on macOS or `Ctrl+Alt+F` elsewhere: Search Pinake documentation from the tree.

## Storage

Pinake Editor keeps generated Pinake files inside the root-level `Pinake/` directory:

- `Pinake/` contains project documentation and should be committed.
- `Pinake/pinake.json` is the public manifest and should be committed.
- `Pinake/.pinake/` stores generated local state such as module state, UI state, indexes, migrations, and version metadata.
- `Pinake/.gitignore` ignores the internal `.pinake/` state folder.

The extension does not create `pinake.json` or `.pinake/` at the workspace root.

## Development

```sh
npm run compile
npm run lint
npm test
```
