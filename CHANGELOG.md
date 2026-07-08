# Changelog

All notable changes to the "pinakes" extension will be documented in this file.

## [Unreleased]

- Added the native Pinake Activity Bar view and documentation tree.
- Added Pinake workspace initialization with `.pinake/pinake.json`, `.pinake/docs/`, and `.pinake/.state/` files.
- Added a setup wizard for template selection, optional modules, and explicit Explorer hiding.
- Added the Minimal Internal Docs default template and Full Product Handbook template for the old larger structure.
- Added persisted expanded/collapsed tree state in `.pinake/.state/ui.json`.
- Added persisted favorites in `.pinake/.state/ui.json` and a virtual Favorites group in the Pinake tree.
- Added Markdown Preview as the default TreeView click behavior and an explicit Edit action for source editing.
- Added explicit tree actions for opening the manifest, duplicating items, revealing in Explorer, copying paths, showing properties, and sorting children.
- Added last-opened tracking and expanded folder restoration for the Pinake tree.
- Added offline documentation search over `.pinake/.state/indexes.json`, including snippets, tag/heading filters, backlinks, broken references, and reference graph data.
- Added a native VS Code interface audit to guide TreeView, wizard, search, validation, and accessibility polish.
- Improved native feedback formatting for search results, validation reports, item properties, and no-result states.
- Added repair support for missing generated core and module files.
- Added upgrade support for legacy Pinake folders, runtime JSON schema validation, and migration history recording.
- Added standalone Pinake validation output for CLI/CI use and a GitHub Actions workflow generator.
- Added basic Markdown style validation warnings for Pinake documents.
- Added keybindings for tree rename, delete, and search.
- Added v0.1 module generation for API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, and Authentication.
- Added basic tree commands for opening, creating, renaming, deleting, refreshing, generating modules, and validating.
- Added JSON schemas, local indexing state, validation services, and automated extension tests.
