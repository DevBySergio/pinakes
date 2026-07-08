# Pinake Editor

Pinake Editor is a VS Code extension for managing internal project documentation from a native VS Code sidebar.

## Features

- Adds a native Activity Bar container and `Project Documentation` tree view.
- Initializes a Pinake workspace in `.pinake/`, with documentation stored in `.pinake/docs`.
- Creates `.pinake/pinake.json` as the source of truth for project metadata, selected modules, and document paths.
- Provides a creation wizard with templates:
  - Minimal Internal Docs
  - Product / Project Docs
  - Technical Architecture
  - API / Service Docs
  - Operations / Runbook
  - Full Product Handbook
- Lets users select optional modules during setup.
- Optionally hides `.pinake` from the standard VS Code Explorer by merging `"**/.pinake": true` into `.vscode/settings.json`.
- Opens Markdown documents from the Pinake TreeView in Markdown Preview by default.
- Provides an explicit `Edit` action to open Markdown source in the editor.
- Supports tree actions: new file, new folder, rename, duplicate, delete, refresh, open preview, edit, reveal in Explorer, copy path, show properties, open manifest, and sort children.
- Saves expanded, collapsed, favorites, and last-opened tree state in `.pinake/.state/ui.json`.
- Shows favorited Markdown files in a virtual `Favorites` group at the top of the Pinake tree.
- Searches local documentation through the offline index in `.pinake/.state/indexes.json`, with snippets, tag/heading filters, backlinks, broken references, and reference graph data.
- Repairs missing generated files without overwriting edited documents.
- Upgrades legacy Pinake folders into the current `.pinake/docs` layout and records migration history.
- Validates Pinake structure, runtime JSON schemas, document paths, ADR names, Markdown style, basic local Markdown links, and warning-only secret hygiene patterns.
- Generates a standalone Pinake validator and GitHub Actions workflow for CI.
- Keeps all data local to the workspace. The extension does not use telemetry or network APIs.

## Commands

- `Pinakes: Create Pinake`
- `Pinake: Create Documentation`
- `Pinake: Open Preview`
- `Pinake: Edit`
- `Pinakes: Generate Module`
- `Pinakes: Search Documentation`
- `Pinakes: Repair`
- `Pinakes: Upgrade Pinake`
- `Pinakes: Generate CI Validation Workflow`
- `Pinakes: Validate`
- `Pinakes: Refresh`
- `Pinakes: New Markdown File`
- `Pinakes: New Folder`
- `Pinakes: Rename`
- `Pinakes: Delete`
- `Pinakes: Open Pinake Manifest`
- `Pinakes: Duplicate`
- `Pinakes: Reveal in Explorer`
- `Pinakes: Copy Relative Path`
- `Pinakes: Show Properties`
- `Pinakes: Sort Children`
- `Pinakes: Add to Favorites`
- `Pinakes: Remove from Favorites`

## Keybindings

- `F2`: Rename the selected Pinake tree item.
- `Delete`: Delete the selected Pinake tree item.
- `Cmd+Alt+F` on macOS or `Ctrl+Alt+F` elsewhere: Search Pinake documentation from the tree.

## Storage

Pinake Editor stores generated Pinake files in a hidden project-internal folder:

- `.pinake/pinake.json` is the Pinake manifest and source of truth.
- `.pinake/docs/` contains project documentation.
- `.pinake/.state/` stores generated local state such as module state, UI state, indexes, migrations, and version metadata.
- `.pinake/.gitignore` ignores the generated `.state/` folder.

The extension does not store project documentation inside `.vscode`. It only writes `.vscode/settings.json` if the user explicitly confirms the option to hide `.pinake` from the standard Explorer during setup.

## Development

```sh
npm run compile
npm run lint
npm run pinake:validate -- --root /path/to/workspace --format json
npm test
```

## Design Reference

- [Pinake Interface Audit](docs/interface-audit.md)
- [Security and Privacy Guidance](docs/security-privacy.md)
- [Component Catalog Roadmap](docs/component-catalog-roadmap.md)
