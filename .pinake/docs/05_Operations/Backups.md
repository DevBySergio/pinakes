---
title: "Backups"
type: runbook
status: draft
order: 4
---
# Backups

## Scope

Pinake Editor does not operate a production database or hosted service. Backup and restore are repository and workspace concerns.

## Assets

| Asset | Backup method | Restore method | Notes |
| --- | --- | --- | --- |
| Source code | Git repository | Checkout or revert commit | Primary recovery path. |
| Authored Pinake docs | Git if committed | Checkout or restore from branch | Review before committing generated docs. |
| Manifest | Git if committed | Restore `.pinake/pinake.json` | Required for TreeView source of truth. |
| Generated state | Regenerate | Run repair, search, or scaffold flows | Ignored by default. |
| VS Code workspace settings | Git if committed | Restore `.vscode/settings.json` | Team decision to commit. |
| Optional CI validator | Git if committed | Regenerate or restore files | Generated only on user command. |

## Restore Procedure

1. Restore repository files from Git or backup.
2. If `.pinake/.state` is missing, run `Pinake: Repair` or rebuild search state.
3. Run Pinake validation.
4. Fix manifest paths, broken links, and frontmatter drift.
5. Run compile, lint, and tests if source files were restored.

## Data Loss Prevention

Scaffold, repair, and module generation write starter files only when missing. Rename, delete, drag-and-drop, duplicate, import, and export still need normal Git review because they change workspace files.
