---
title: "Command Catalog"
type: reference
status: draft
order: 3
---
# Command Catalog

## Commands

| Title | Command id |
| --- | --- |
| Pinake: Create Documentation | `pinakes.createPinake`, `pinake.create` |
| Pinake: Refresh | `pinakes.refresh`, `pinake.refresh` |
| Pinake: Open Preview | `pinakes.openFile`, `pinakes.openPreview`, `pinake.openPreview` |
| Pinake: Edit | `pinakes.openFileSide`, `pinakes.editDocument`, `pinake.editDocument` |
| Pinake: Open Manifest | `pinakes.openManifest` |
| Pinake: Duplicate | `pinakes.duplicate` |
| Pinake: Reveal in Explorer | `pinakes.revealInExplorer` |
| Pinake: Copy Relative Path | `pinakes.copyPath` |
| Pinake: Show Properties | `pinakes.showProperties` |
| Pinake: Set Tree Sort Order | `pinakes.sortChildren` |
| Pinake: Add to Favorites | `pinakes.addFavorite` |
| Pinake: Remove from Favorites | `pinakes.removeFavorite` |
| Pinake: New Markdown File | `pinakes.newFile` |
| Pinake: New Folder | `pinakes.newFolder` |
| Pinake: Rename | `pinakes.rename` |
| Pinake: Delete | `pinakes.delete` |
| Pinake: Generate Module | `pinakes.generateModule` |
| Pinake: Search Documentation | `pinakes.searchDocumentation` |
| Pinake: Repair | `pinakes.repair` |
| Pinake: Upgrade | `pinakes.upgrade` |
| Pinake: Generate CI Validation Workflow | `pinakes.generateCiValidation` |
| Pinake: Export | `pinakes.export` |
| Pinake: Import Markdown | `pinakes.import` |
| Pinake: Validate | `pinakes.validate` |
| Pinake: Install Agent Skill | `pinakes.installAgentSkill` |

## Keybindings

| Windows/Linux | macOS | Command |
| --- | --- | --- |
| `Ctrl+Alt+P` | `Cmd+Alt+P` | Open preview |
| `Ctrl+Alt+E` | `Cmd+Alt+E` | Edit document |
| `Ctrl+Alt+S` | `Cmd+Alt+S` | Add or remove favorite |
| `Ctrl+Alt+R` | `Cmd+Alt+R` | Reveal in Explorer |
| `Ctrl+Alt+C` | `Cmd+Alt+C` | Copy relative path |
| `Ctrl+Alt+V` | `Cmd+Alt+V` | Validate |
| `Ctrl+Alt+F` | `Cmd+Alt+F` | Search documentation |
| `F2` | `F2` | Rename selected item |
| `Delete` | `Delete` | Delete selected item |

## Compatibility Note

User-facing command titles use singular `Pinake:`. Existing `pinakes.*` command ids remain available for compatibility, and selected commands also expose `pinake.*` aliases.
