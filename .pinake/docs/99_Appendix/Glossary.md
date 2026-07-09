---
title: "Glossary"
type: glossary
status: draft
order: 1
---
# Glossary

## Terms

| Term | Meaning |
| --- | --- |
| Pinake | Workspace-local project documentation structure managed by Pinake Editor. |
| Pinake Editor | VS Code extension in this repository. |
| Manifest | `.pinake/pinake.json`, the JSON source of truth for project metadata, modules, and document records. |
| Document record | Manifest entry with id, title, path, type, status, and order. |
| Storage root | Documentation root, currently `.pinake/docs`. |
| Generated state | Extension-owned files under `.pinake/.state`. |
| TreeView | Native VS Code tree named `Project Documentation`. |
| Favorite | UI-state reference to a frequently used Pinake document. |
| Index | Offline search and link graph state in `.pinake/.state/indexes.json`. |
| Repair | Command that recreates missing generated files and discovers untracked Markdown. |
| Upgrade | Command that migrates legacy `Pinake/` folders to current `.pinake/docs` layout. |
| Component module | Generated focused documentation package such as CLI, Security, API, Docker, or CI/CD. |
| Setup template | Initial documentation structure selected during `Pinake: Create Documentation`. |
| ADR | Architecture Decision Record; Pinake validation expects `ADR-####-*.md` for ADR docs. |

## Acronyms

| Acronym | Expanded form |
| --- | --- |
| ADR | Architecture Decision Record |
| CI | Continuous Integration |
| CLI | Command-Line Interface |
| SLO | Service-Level Objective |
| UI | User Interface |
| UX | User Experience |
