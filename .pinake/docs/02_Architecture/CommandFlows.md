---
title: "Command Flows"
type: architecture
status: draft
order: 4
---
# Command Flows

## Create Documentation

`Pinake: Create Documentation` resolves a workspace root, asks for template, modules, Explorer visibility, and legacy migration behavior, then shows a final summary before writing files. It creates missing directories, writes template Markdown if absent, creates or updates the manifest, creates generated state, writes `.pinake/.gitignore`, optionally updates `.vscode/settings.json`, and rebuilds the index.

## Document Navigation

| Command | Behavior |
| --- | --- |
| `Pinake: Open Preview` | Resolves the selected document and runs `markdown.showPreview`. |
| `Pinake: Edit` | Opens source Markdown with `preview: false`. |
| Tree item default command | Opens preview for document and favorite nodes. |
| Last opened tracking | Records the relative path in UI state after preview or edit. |

## File Management

| Command | Safety controls |
| --- | --- |
| New Markdown File | Validates and normalizes file name, writes frontmatter, adds manifest entry, updates index. |
| New Folder | Validates and normalizes folder name, creates inside docs root. |
| Rename | Rejects virtual favorites, validates name, prevents collisions, updates manifest/state/index. |
| Delete | Requires modal confirmation, rejects virtual favorites, uses trash when supported, updates manifest/state/index. |
| Duplicate | Creates a non-overwriting copy target and adds copied Markdown to the manifest. |
| Drag-and-drop | Keeps moves inside `.pinake/docs`, rejects self-nesting, collisions, and duplicate targets. |

## Maintenance Commands

| Command | Behavior |
| --- | --- |
| Repair | Creates missing template docs and state, discovers untracked Markdown, preserves edited documents. |
| Upgrade | Copies legacy `Pinake/` contents into `.pinake/docs`, creates current manifest/state, records migration. |
| Generate Module | Adds generated component module docs, dependencies, manifest flags, state, and index. |
| Validate | Runs validation and publishes VS Code diagnostics. |
| Generate CI Validation Workflow | Writes optional validator and GitHub workflow when missing. |
| Import Markdown | Copies Markdown from an external folder to `.pinake/docs/imported` and updates manifest/index. |
| Export | Writes a static bundle with `docs/`, `pinake.json`, and `index.html` outside `.pinake/docs`. |
| Install Agent Skill | Copies packaged Pinake skill to the Codex skill directory with overwrite confirmation. |

## Error Reporting

High-risk flows catch exceptions, append details to the Pinakes output channel, and show concise VS Code error messages. Validation uses the output channel for reports and the Problems panel for file-scoped diagnostics.

## Related Docs

- [Command Catalog](../99_Appendix/CommandCatalog.md)
- [Storage And State](StorageAndState.md)
