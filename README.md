# Pinake Editor

Pinake Editor is a VS Code extension for managing internal project documentation from a native VS Code sidebar.

![Pinake Editor preview](docs/assets/pinake-editor-preview.png)

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
- Highlights recommended optional modules during setup while keeping template defaults lightweight.
- Optionally hides `.pinake` from the standard VS Code Explorer by merging `"**/.pinake": true` into `.vscode/settings.json`.
- Opens Markdown documents from the Pinake TreeView in Markdown Preview by default.
- Provides an explicit `Edit` action to open Markdown source in the editor.
- Supports tree actions: new file, new folder, rename, duplicate, delete, refresh, open preview, edit, reveal in Explorer, copy path, show properties, open manifest, and sort children.
- Saves expanded, collapsed, favorites, and last-opened tree state in `.pinake/.state/ui.json`.
- Shows favorited Markdown files in a virtual `Favorites` group at the top of the Pinake tree.
- Searches local documentation through the offline index in `.pinake/.state/indexes.json`, with snippets, tag/heading filters, backlinks, broken references, and reference graph data.
- Repairs missing generated files without overwriting edited documents.
- Upgrades legacy Pinake folders into the current `.pinake/docs` layout and records migration history.
- Validates Pinake structure, runtime JSON schemas, document paths, ADR names, Markdown frontmatter alignment, Markdown style, basic local Markdown links, and warning-only secret hygiene patterns.
- Generates a standalone Pinake validator and GitHub Actions workflow for CI.
- Keeps all data local to the workspace. The extension does not use telemetry or network APIs.

## Commands

- `Pinake: Create Documentation`
- `Pinake: Open Preview`
- `Pinake: Edit`
- `Pinake: Generate Module`
- `Pinake: Search Documentation`
- `Pinake: Repair`
- `Pinake: Upgrade`
- `Pinake: Generate CI Validation Workflow`
- `Pinake: Export`
- `Pinake: Import Markdown`
- `Pinake: Validate`
- `Pinake: Refresh`
- `Pinake: New Markdown File`
- `Pinake: New Folder`
- `Pinake: Rename`
- `Pinake: Delete`
- `Pinake: Open Manifest`
- `Pinake: Duplicate`
- `Pinake: Reveal in Explorer`
- `Pinake: Copy Relative Path`
- `Pinake: Show Properties`
- `Pinake: Set Tree Sort Order`
- `Pinake: Add to Favorites`
- `Pinake: Remove from Favorites`

## Keybindings

- `F2`: Rename the selected Pinake tree item.
- `Delete`: Delete the selected Pinake tree item.
- `Cmd+Alt+P` on macOS or `Ctrl+Alt+P` elsewhere: Open preview for the selected Pinake document.
- `Cmd+Alt+E` on macOS or `Ctrl+Alt+E` elsewhere: Edit the selected Pinake document.
- `Cmd+Alt+S` on macOS or `Ctrl+Alt+S` elsewhere: Add or remove the selected Pinake document from Favorites.
- `Cmd+Alt+R` on macOS or `Ctrl+Alt+R` elsewhere: Reveal the selected Pinake item in Explorer.
- `Cmd+Alt+C` on macOS or `Ctrl+Alt+C` elsewhere: Copy the selected Pinake item path.
- `Cmd+Alt+V` on macOS or `Ctrl+Alt+V` elsewhere: Validate the current Pinake.
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

- [Pinake Public Specification](docs/public-specification.md)
- [Pinake Scaffold Reference](docs/scaffold-reference.md)
- [Pinake Extension Architecture And Flows](docs/extension-architecture-and-flows.md)
- [Pinake Clean Architecture Boundaries](docs/clean-architecture-boundaries.md)
- [Pinake Interface Audit](docs/interface-audit.md)
- [Pinake Interface Accessibility QA](docs/interface-accessibility-qa.md)
- [Security and Privacy Guidance](docs/security-privacy.md)
- [Component Catalog Roadmap](docs/component-catalog-roadmap.md)
- [Release Checklist](docs/release-checklist.md)
- [Sample Pinake Workspace](examples/sample-pinake-workspace)
