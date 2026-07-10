# Changelog

All notable changes to the "pinakes" extension will be documented in this file.

## [Unreleased]

## [1.0.0] - 2026-07-10

- Added the native Pinake Activity Bar view and documentation tree.
- Added Pinake workspace initialization with `.pinake/pinake.json`, `.pinake/docs/`, and `.pinake/.state/` files.
- Added a setup wizard for template selection, optional modules, explicit Explorer hiding, legacy migration, and a final confirmation summary before writing files.
- Added the Minimal Internal Docs default template, Full Product Handbook template, and expanded component module catalog.
- Improved setup template starter docs with richer prompts, ownership fields, review cues, and recommended optional module guidance.
- Added persisted expanded/collapsed tree state in `.pinake/.state/ui.json`.
- Added persisted favorites in `.pinake/.state/ui.json` and a virtual Favorites group in the Pinake tree.
- Added Markdown Preview as the default TreeView click behavior and an explicit Edit action for source editing.
- Added explicit tree actions for opening the manifest, duplicating items, revealing in Explorer, copying paths, showing properties, sorting children, and drag-and-drop move/reorder.
- Added last-opened tracking and expanded folder restoration for the Pinake tree.
- Added offline documentation search over `.pinake/.state/indexes.json`, including snippets, tag/heading filters, backlinks, broken references, and reference graph data.
- Added a native VS Code interface audit to guide TreeView, wizard, search, validation, and accessibility polish.
- Improved native feedback formatting for search results, validation reports, item properties, and no-result states.
- Added repair support for missing generated core and module files.
- Added upgrade support for legacy Pinake folders, runtime JSON schema validation, and migration history recording.
- Added standalone Pinake validation output for CLI/CI use, a GitHub Actions workflow generator, and project CI for extension compile/lint/test.
- Added basic Markdown style validation warnings, warning-only secret hygiene checks, and VS Code Problems diagnostics for Pinake documents.
- Added import/export workflows for Markdown folders and static Pinake documentation bundles.
- Added the packaged Pinake agent skill and the user-scoped `Pinake: Install Agent Skill` command.
- Added public specification, scaffold reference, architecture flow, clean-boundary, accessibility QA, security/privacy, and release checklist documentation.
- Added keybindings for preview, edit, favorite, reveal, copy path, validate, tree rename, delete, and search.
- Added v0.1 module generation for API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, Authentication, GraphQL, gRPC, WebSocket, Backend, Cache, Message Queue, OAuth, IaC, Monitoring, Security, CLI, SDK, and Microservice.
- Added basic tree commands for opening, creating, renaming, deleting, refreshing, generating modules, and validating.
- Added JSON schemas, local indexing state, validation services, and automated extension tests.
