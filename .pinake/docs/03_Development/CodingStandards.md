---
title: "Coding Standards"
type: reference
status: draft
order: 2
---
# Coding Standards

## Architectural Conventions

| Area | Standard |
| --- | --- |
| Activation | Wire services and VS Code resources in `src/extension.ts`. |
| Commands | Keep prompts, confirmations, notifications, and orchestration in `PinakesCommands`. |
| Filesystem | Use `FileService` instead of direct VS Code filesystem calls in services. |
| Manifest | Use `ManifestService` for creation, normalization, sorting, add/remove, and rename operations. |
| State | Use `StateService` for generated UI/module/version/migration state updates. |
| Paths | Use URI utilities and normalize POSIX-style Pinake-relative paths. |
| Validation | Keep runtime validation and standalone validator behavior aligned. |
| Templates | Maintain unique document ids and paths; generated starter docs should include actionable sections. |

## Naming And Paths

- Public command titles use `Pinake:`.
- Existing command IDs use `pinakes.*` and compatibility aliases use `pinake.*` where already contributed.
- Core template folders may be lowercase or full-handbook capitalized according to template definition.
- Generated component modules use capitalized folders such as `03_Development/CLI` and `04_Architecture/Security`.
- ADR files should match `ADR-####-meaningful-name.md`.

## Error Handling

| Situation | Pattern |
| --- | --- |
| Missing workspace root | Show a concise warning or error and return. |
| User cancellation | Return without side effects. |
| Potential destructive action | Use modal confirmation. |
| Command failure | Append details to Pinakes output channel and show a concise error. |
| Validation failure | Report through output channel and diagnostics, not thrown exceptions for warnings. |

## Testable Behaviors

Prefer tests around behavior and storage contracts: scaffold id/path stability, non-overwrite rules, state sync, import/export safety, link resolution, validation warnings/errors, diagnostics, and generated module dependencies.

## Avoid

- Do not write documentation under `.vscode`.
- Do not overwrite edited Markdown during repair or module generation.
- Do not let manifest paths escape `.pinake/docs`.
- Do not add real credentials to fixtures or docs.
- Do not make generated state the source of truth for authored content.
