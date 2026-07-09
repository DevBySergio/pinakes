---
title: "Containers"
type: architecture
status: draft
order: 2
---
# Containers

## Runtime Units

| Unit | Responsibility | Runtime | Health signal |
| --- | --- | --- | --- |
| Extension activation | Instantiates services, TreeView, drag/drop controller, output channel, diagnostics, file watcher, and commands. | VS Code extension host | Commands register and tree refreshes. |
| Command orchestrator | Owns user-facing prompts, confirmations, notifications, and command sequencing. | `PinakesCommands` | Commands complete or report errors to the output channel. |
| Tree provider | Renders manifest-backed documents, folders, favorites, empty states, tooltips, and item commands. | `PinakeTreeProvider` | Tree reflects manifest and filesystem after refresh. |
| Drag-and-drop controller | Moves files/folders inside `.pinake/docs` and updates manifest, UI state, index, and diagnostics. | `PinakeTreeDragAndDropController` | Move completes and validation result is surfaced. |
| Services | Encapsulate filesystem, manifest, state, scaffold, index, transfer, validation, diagnostics, and skill installation logic. | `src/services/*` | Focused tests pass and command flows stay thin. |
| Templates and modules | Define setup template docs and generated component module docs. | `src/templates/*`, `src/modules/*` | Scaffold tests verify unique ids, paths, and starter content. |
| Standalone validator | Validates Pinake workspaces outside VS Code. | Node script `scripts/validate-pinake.mjs` | Exit code 0 when no errors are present. |

## Dependency Direction

`src/extension.ts` wires dependencies at activation. Commands depend on services and the tree provider. Services depend on `FileService`, schemas, templates, and utility modules. Low-level helpers should not depend on command UI.

## Main Service Responsibilities

| Service | Responsibility |
| --- | --- |
| `WorkspaceService` | Resolve or pick workspace root and default project name. |
| `FileService` | Wrap VS Code filesystem operations and JSON/text reads/writes. |
| `ManifestService` | Create, read, write, validate, sort, add, remove, and rename manifest documents. |
| `ScaffoldService` | Initialize, repair, upgrade, generate modules, create state, hide Explorer files, and generate CI validation. |
| `StateService` | Create and update generated module, UI, index, migration, and version state. |
| `IndexService` | Build offline search indexes, snippets, backlinks, broken references, and graph data. |
| `PinakeTransferService` | Import Markdown directories and export static Pinake bundles. |
| `ValidationService` | Validate required entries, JSON schemas, manifest paths, ADR names, frontmatter, links, style, and secret hygiene. |
| `ValidationDiagnosticsService` | Publish Pinake validation issues to VS Code Problems. |
| `AgentSkillInstaller` | Copy the packaged Pinake skill into the user's Codex skill directory. |

## Communication Flow

| Source | Target | Mechanism | Failure behavior |
| --- | --- | --- | --- |
| User command | `PinakesCommands` | VS Code command registration | Warning or error message, output channel details. |
| Command | Service | Direct TypeScript calls | Exceptions are caught in higher-risk flows. |
| Service | Filesystem | `vscode.workspace.fs` | Missing files are either repaired, skipped, or reported. |
| File watcher | Tree provider | Debounced refresh | Tree refreshes after `.pinake/**` changes. |
| Validation | Diagnostics | Diagnostic collection | Pinake-scoped Problems entries are updated or cleared. |
