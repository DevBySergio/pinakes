---
title: "ADR-0002: Native VS Code Surfaces"
type: adr
status: draft
order: 2
---
# ADR-0002: Native VS Code Surfaces

## Status

Accepted by repository design evidence.

## Context

The extension needs a documentation navigation and command experience inside VS Code. A custom webview would increase UI surface area and accessibility burden. Existing docs state that Pinake Editor uses native VS Code APIs and no custom explorer webview for the documentation tree.

## Decision

Use native VS Code surfaces: Activity Bar container, TreeView, context menus, keybindings, QuickPick, InputBox, Markdown Preview, output channels, diagnostics, and filesystem watchers.

## Consequences

| Positive | Tradeoff |
| --- | --- |
| Better integration with VS Code accessibility and theming. | UI customization is constrained by native components. |
| Lower maintenance surface than a custom webview. | Complex layouts must be expressed through TreeView and commands. |
| Markdown Preview handles document rendering. | Preview behavior follows VS Code Markdown capabilities. |
| Problems diagnostics are familiar to developers. | Validation messages need file and line precision when possible. |

## Follow-Up

Use `docs/interface-audit.md` and `docs/interface-accessibility-qa.md` when changing TreeView labels, interactions, keybindings, or dense-tree behavior.
