# Pinake Interface Audit

This audit covers the current native VS Code interface for Pinake Editor. The goal is to guide the next UI polish tasks while keeping the extension fast, minimal, and consistent with VS Code conventions.

## Scope

The audited surfaces are:

- Activity Bar container and `Project Documentation` TreeView.
- Tree hierarchy, document nodes, folder nodes, favorites, icons, descriptions, tooltips, and restored expansion state.
- View title actions, item context actions, command palette commands, and keybindings.
- Creation wizard, template picker, module picker, Explorer visibility choice, legacy migration choice, and existing `.pinake` confirmation.
- Module generation picker.
- Search input and QuickPick results.
- Validation notification and output channel report.
- Properties output channel report.
- Repair, upgrade, CI generation, favorite, copy path, duplicate, rename, delete, and sort feedback.
- Empty states and no-workspace or no-selection command paths.

## Current Surface Inventory

| Surface | Current behavior | Design risk |
| --- | --- | --- |
| Activity Bar container | Uses a native container named `Pinake` and a native TreeView named `Project Documentation`. | The container and view names are clear, but command titles mix `Pinake` and `Pinakes`, which weakens recall from the Command Palette. |
| Root tree | Shows manifest-derived folders and documents under `.pinake/docs`; falls back to filesystem entries when no manifest children exist. | Empty or not-yet-created workspaces show no guided state inside the tree. Users must discover setup through toolbar or Command Palette. |
| Favorites | Adds a virtual `Favorites` group above the normal tree when favorite files exist. | The virtual group is useful, but it has no empty affordance or direct action to manage favorites when none exist. |
| Document nodes | Document labels come from manifest titles; Markdown opens preview by default and edit is explicit. | This is a good default, but status only appears as a small description and can be missed in dense trees. |
| Folder nodes | Folder icons map common Pinake sections and technical modules to VS Code theme icons. | Some icon mappings rely on exact folder names. New component catalog entries will need a maintained icon map or fallback rule. |
| View title actions | Exposes create, new file, new folder, generate module, search, repair, upgrade, CI generation, validate, manifest, sort, and refresh. | The toolbar is comprehensive but crowded. High-frequency navigation actions compete with setup and maintenance actions. |
| Context actions | File and folder actions cover preview, edit, favorite, reveal, copy path, properties, creation, rename, duplicate, sort, and delete. | Context group order is mostly predictable. Destructive delete is separated, which should be preserved. |
| Keybindings | Supports rename, delete, and search from the TreeView. | Keyboard coverage is useful but incomplete for preview, edit, favorite, reveal, and copy path. |
| Creation wizard | Runs workspace selection, template selection, module selection, Explorer visibility, legacy migration, and existing `.pinake` confirmation. | The flow is safe but long. It does not show progress, expected output, or a final summary before writing files. |
| Module generation | Supports presets and individual module selection. | There are now two module selection concepts: creation template modules and v0.1 module generator descriptors. The difference is not obvious from labels. |
| Search | Prompts for path, heading, tag, and text search. Results show title/path, tags, snippet, and matched terms. | Query syntax is only explained in the input prompt. Empty results do not suggest examples or filters to try. |
| Validation | Shows a summary notification and writes a plain text report to the `Pinakes` output channel. | Output is readable, but issues are not grouped by severity or file, and there are no direct open-file actions. |
| Properties | Writes selected item properties to the `Pinakes` output channel. | The information is useful, but output channel presentation is passive and timestamps are developer-oriented ISO strings. |
| Feedback messages | Scaffold, repair, upgrade, and CI generation report counts for created, skipped, and updated files. | Counts are concise but do not say where to inspect detailed results unless the output channel has been used by the command. |
| No-selection paths | Commands show warning messages when a file or folder is required. | The messages are clear, but repeated warning-only flows can feel abrupt for first-time users. |

## Friction Points

The interface is strongest when it behaves like the native Explorer: TreeView navigation, context menus, command palette access, preview/edit split, and filesystem-safe operations all fit VS Code expectations. The main friction is not visual complexity; it is inconsistent language and uneven guidance between surfaces.

Command naming should be normalized. User-facing titles currently mix `Pinake:` and `Pinakes:` while the product name is `Pinake Editor`. The extension can keep existing command IDs for compatibility, but future titles and docs should use singular `Pinake:` unless there is a strong reason not to.

The setup flow is safe but opaque. A user makes several choices before seeing what will be created. The wizard should keep the native QuickPick approach, but each step should expose the effect of the choice in `detail`, and the final step should summarize template, selected modules, storage location, Explorer visibility, legacy migration behavior, and overwrite policy.

The view title toolbar has accumulated setup, maintenance, navigation, validation, and file creation actions. That is acceptable for power users, but the order should make the first-run path and daily-use path distinct. Setup and repair actions should not visually compete with new file, search, refresh, and manifest actions.

The TreeView has no explicit empty state. When there is no workspace, no `.pinake`, or an empty manifest, users should receive a clear native message through command feedback and view title affordances. Avoid a custom webview for this; the goal is to make commands and messages predictable, not to build a separate landing page.

Search has become capable enough to need better affordances. The input prompt should include one compact example, and empty results should suggest retrying with `tag:`, `heading:`, or a simpler term. Search results should keep the title/path/tags/snippet layout because it is scannable.

Validation and properties are useful but feel like raw reports. The output channel should remain the main detailed surface, but reports should be grouped, stable, and easy to scan. Future work can add file-opening commands from selected validation issues, but that should be native command behavior rather than a custom webview.

Sort behavior is global through UI state, while the command title says `Sort Children`. The wording should make the scope explicit, such as `Pinake: Set Tree Sort Order`, or the behavior should become folder-local.

## Design Principles

1. Use native VS Code surfaces first. Prefer TreeView, QuickPick, InputBox, output channels, notifications, keybindings, and built-in Markdown preview. Do not introduce a custom webview for the main documentation explorer.

2. Make the primary path obvious. Daily use should optimize for open preview, edit source, search, create document, and validate. Setup, migration, repair, and CI generation should remain available but not dominate the toolbar.

3. Keep file safety visible. Any command that writes, migrates, deletes, or updates generated files should say what it will touch and whether existing user documents are preserved.

4. Use one vocabulary. User-facing titles should consistently use `Pinake`, `.pinake`, `Pinake document`, `Preview`, `Edit`, `Validate`, and `Repair`. Avoid mixing old `Pinakes` labels into new visible UI.

5. Separate reading from editing. Opening a document should continue to show Markdown Preview by default. Source editing should stay explicit through `Edit`, context menus, and command palette actions.

6. Keep feedback short, then offer detail. Notifications should confirm the outcome in one sentence. Output channel reports should provide paths, counts, and grouped details.

7. Do not rely on color alone. Status, validation severity, favorites, and destructive actions need text labels, icons, or grouping in addition to theme colors.

8. Preserve keyboard parity. Every high-frequency TreeView action should be reachable through the Command Palette and should work with the current selection or active Pinake document when reasonable.

9. Keep generated structure inspectable. The extension hides `.pinake` from the standard Explorer only by explicit user choice, and it should continue to expose manifest, copy path, reveal, and properties actions.

## Theme And Accessibility Acceptance Notes

Light theme:

- Theme icons should remain visible on light backgrounds without custom colors.
- Tree item descriptions should not be the only place where critical state appears.
- QuickPick detail text should be concise enough that the main label remains readable.

Dark theme:

- Output channel reports should stay plain text with stable headings and no color assumptions.
- Warning and information messages should avoid long path-heavy text that wraps poorly.
- Snippets in search results should not crowd out path and tag context.

High Contrast theme:

- Favorites, validation severity, and document status must not rely on icon color alone.
- Destructive actions should keep modal confirmation and explicit `Delete` wording.
- Any future icon additions should use VS Code `ThemeIcon` names rather than custom image assets unless there is a tested high-contrast asset.

Keyboard and screen reader use:

- All primary actions should be available from the Command Palette.
- Context actions should work with selected TreeView items, and file actions should also support the active editor when it is inside `.pinake/docs`.
- QuickPick labels should be meaningful without relying on descriptions or details.
- Output reports should use predictable headings and path-first lines so they are easy to navigate by text search.

## Implementation-Ready Recommendations

Priority 1:

- Normalize new user-facing command titles to singular `Pinake:` while keeping existing command IDs for compatibility.
- Add a concise empty-state strategy: when `.pinake` is missing, toolbar create remains primary, and commands report `Create a Pinake first` with the exact command name.
- Reorder view title actions into daily-use first, then setup/maintenance, then refresh.
- Rename or reword sort as a global tree sort setting unless folder-local sorting is implemented.
- Add one search example to the input prompt and one empty-result suggestion message.

Priority 2:

- Add a final setup summary step before writing files.
- Group validation output by severity and path, with a summary count per severity.
- Add command palette aliases for frequent actions: open preview, edit, favorite, reveal, copy path, and validate.
- Show document type/status more consistently in tooltips and output reports, not only in TreeView descriptions.
- Document the difference between template modules and legacy module generation until the two flows are unified.

Priority 3:

- Add a theme QA checklist to release verification: Light, Dark, High Contrast, keyboard-only, and screen reader label pass.
- Consider a `Pinake: Open Getting Started` command that opens README or generated overview content, using Markdown preview rather than a custom webview.
- Add tests for command title registration, context availability assumptions, and no-workspace/no-selection feedback.

## Non-Goals

- Do not replace the TreeView with a custom explorer webview.
- Do not add decorative UI, custom colors, or custom HTML for core navigation.
- Do not make `.pinake` hidden by default without explicit user choice.
- Do not remove existing command IDs while users may have keybindings or workflows depending on them.
