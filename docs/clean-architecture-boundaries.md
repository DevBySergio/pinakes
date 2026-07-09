# Pinake Clean Architecture Boundaries

This document defines the current Pinake Editor ownership rules. The extension is still intentionally small, so the boundary is pragmatic: keep pure project definitions and formatting code independent from VS Code APIs, and keep VS Code UI, filesystem, workspace, and diagnostics access in explicit adapter-facing modules.

## Layer Ownership

| Layer | Files | Owns | Must avoid |
| --- | --- | --- | --- |
| Domain and definitions | `src/types.ts`, `src/constants.ts` | Shared Pinake data shapes, validation issue shapes, scaffold result shapes, and stable names. | VS Code APIs, filesystem access, UI prompts, mutable process state. |
| Template catalog | `src/templates/*`, `src/modules/*` | Pinake setup templates, generated module descriptors, starter Markdown content, and presets. | VS Code APIs, workspace paths, runtime filesystem calls. |
| Pure formatting and validation helpers | `src/services/FeedbackFormatter.ts`, `src/services/JsonSchemaValidator.ts` | User-facing strings, QuickPick item shapes, report formatting, and JSON schema validation logic. | VS Code API calls, direct file writes, command orchestration. |
| Application services | `src/services/ManifestService.ts`, `StateService.ts`, `IndexService.ts`, `ScaffoldService.ts`, `PinakeTransferService.ts`, `ValidationService.ts` | Manifest/state/index/scaffold/export/import/validation workflows and persistence rules. | Notifications, QuickPick/InputBox flows, TreeView item construction. |
| Infrastructure adapters | `src/services/FileService.ts`, `WorkspaceService.ts`, `ValidationDiagnosticsService.ts`, `AgentSkillInstaller.ts`, `uriUtils.ts` | VS Code filesystem, workspace, diagnostics, Uri conversion, and host-specific integration. | Business decisions that belong in application services. |
| UI adapters | `src/commands/*`, `src/tree/*`, `src/extension.ts` | Activation, command registration, prompts, confirmations, notifications, TreeView items, and refresh wiring. | Manifest mutation details that belong in services when reusable. |

## VS Code API Boundary

The following source areas may import `vscode` directly:

- Extension activation and command registration: `src/extension.ts`, `src/commands/*`.
- TreeView adapters: `src/tree/*`.
- Host and persistence adapters: `FileService`, `WorkspaceService`, `ValidationDiagnosticsService`, `AgentSkillInstaller`, and `uriUtils`.
- Application services that still use `vscode.Uri` as their path boundary: `ManifestService`, `StateService`, `IndexService`, `ScaffoldService`, `PinakeTransferService`, and `ValidationService`.

Domain files, template catalog files, generated module descriptors, formatter helpers, and the JSON schema validator must not import `vscode`. They should remain portable TypeScript modules.

## Dependency Direction

- UI adapters may depend on application services and pure helpers.
- Application services may depend on domain types, templates, pure helpers, and infrastructure adapters.
- Domain, templates, module descriptors, formatters, and schema validation must not depend on UI adapters or VS Code APIs.
- Tests may import VS Code APIs because they run inside the extension host and verify native extension behavior.

## Change Rules

- When adding a new command or TreeView behavior, keep prompts and notifications in `PinakesCommands` or `PinakeTreeProvider`.
- When adding reusable manifest, state, index, scaffold, or validation behavior, put it in a service and keep the command as orchestration.
- When adding a generated documentation module, keep it in `src/modules/moduleDescriptors.ts` and avoid runtime side effects.
- When adding a new direct `vscode` import, either place it in an allowed adapter/service file or update this document and the architecture boundary test with the reason.
